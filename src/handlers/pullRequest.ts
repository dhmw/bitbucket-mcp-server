/**
 * Pull Request-related operation handlers
 */

import { AxiosInstance } from 'axios';
import { BitbucketPullRequest, BitbucketComment } from '../types.js';

/**
 * Resolve a reviewer identifier to its canonical form
 * Attempts to resolve display names via the Bitbucket API when necessary
 */
async function resolveReviewer(
  reviewer: any,
  axiosInstance: AxiosInstance,
  workspace: string
): Promise<{ uuid?: string; account_id?: string; username?: string }> {
  // If already an object with the right structure, return as-is
  if (typeof reviewer === 'object' && reviewer !== null && (reviewer.uuid || reviewer.account_id || reviewer.username)) {
    return reviewer;
  }

  // If it's a string, determine what type it is
  const reviewerStr = String(reviewer);

  // Check if it's a UUID (contains colons or is wrapped in braces)
  if (reviewerStr.includes(':') || reviewerStr.startsWith('{')) {
    // Ensure UUID is wrapped in braces
    const uuid = reviewerStr.startsWith('{') ? reviewerStr : `{${reviewerStr}}`;
    return { uuid };
  }

  // Check if it's an account_id (long hex string, typically 24+ characters)
  if (/^[0-9a-f]{24,}$/i.test(reviewerStr)) {
    return { account_id: reviewerStr };
  }

  // Check if it looks like a username (no spaces, common patterns)
  if (/^[a-zA-Z0-9._-]+$/.test(reviewerStr)) {
    return { username: reviewerStr };
  }

  // If it contains spaces or special characters, treat as display name
  // Try to resolve it by searching workspace members
  try {
    const membersResponse = await axiosInstance.get(`/workspaces/${workspace}/members`, {
      params: { pagelen: 100 }
    });

    const members = membersResponse.data.values || [];

    // Try to find exact match on display name
    let match = members.find((member: any) =>
      member.user?.display_name === reviewerStr
    );

    if (match?.user?.username) {
      return { username: match.user.username };
    }

    // Try case-insensitive match
    const lowerReviewerStr = reviewerStr.toLowerCase();
    match = members.find((member: any) =>
      member.user?.display_name?.toLowerCase() === lowerReviewerStr
    );

    if (match?.user?.username) {
      return { username: match.user.username };
    }

    // Try partial match on display name
    match = members.find((member: any) =>
      member.user?.display_name?.toLowerCase().includes(lowerReviewerStr) ||
      lowerReviewerStr.includes(member.user?.display_name?.toLowerCase())
    );

    if (match?.user?.username) {
      return { username: match.user.username };
    }

    // If no match found, log warning and treat as username anyway
    console.warn(`Could not resolve reviewer display name "${reviewerStr}" - treating as username`);
    return { username: reviewerStr };
  } catch (error) {
    // If API call fails, treat as username
    console.warn(`Failed to resolve reviewer display name "${reviewerStr}" via API - treating as username`, error);
    return { username: reviewerStr };
  }
}

export class PullRequestHandlers {
  constructor(
    private axiosInstance: AxiosInstance,
    private workspace: string
  ) {}

  async createPullRequest(args: any) {
    const {
      repository,
      title,
      description = '',
      source_branch,
      destination_branch = 'main',
      reviewers = [],
      include_default_reviewers = true,
    } = args;

    // Fetch default reviewers if requested
    let allReviewers = [...reviewers];

    if (include_default_reviewers) {
      try {
        const defaultReviewersResponse = await this.axiosInstance.get(
          `/repositories/${this.workspace}/${repository}/effective-default-reviewers`
        );

        const defaultReviewers = defaultReviewersResponse.data.values || [];

        // Extract usernames from default reviewers
        const defaultReviewerUsernames = defaultReviewers
          .map((reviewer: any) => reviewer.user?.username)
          .filter((username: string | undefined) => username !== undefined);

        // Merge with provided reviewers, avoiding duplicates
        const providedUsernames = new Set(reviewers);
        const uniqueDefaultReviewers = defaultReviewerUsernames.filter(
          (username: string) => !providedUsernames.has(username)
        );

        allReviewers = [...reviewers, ...uniqueDefaultReviewers];
      } catch (error) {
        // If fetching default reviewers fails, just use the provided reviewers
        // Log the error but don't fail the PR creation
        console.error('Warning: Failed to fetch default reviewers:', error);
      }
    }

    // Resolve all reviewers to their canonical form
    const resolvedReviewers = await Promise.all(
      allReviewers.map(reviewer => resolveReviewer(reviewer, this.axiosInstance, this.workspace))
    );

    const pullRequestData = {
      title,
      description,
      source: {
        branch: {
          name: source_branch,
        },
      },
      destination: {
        branch: {
          name: destination_branch,
        },
      },
      reviewers: resolvedReviewers,
    };

    const response = await this.axiosInstance.post(
      `/repositories/${this.workspace}/${repository}/pullrequests`,
      pullRequestData
    );

    const pullRequest: BitbucketPullRequest = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Pull request created successfully',
            pull_request: {
              id: pullRequest.id,
              title: pullRequest.title,
              description: pullRequest.description,
              state: pullRequest.state,
              source_branch: pullRequest.source.branch.name,
              destination_branch: pullRequest.destination.branch.name,
              author: pullRequest.author.display_name,
              url: pullRequest.links.html.href,
              created_on: pullRequest.created_on,
              reviewers_added: allReviewers.length,
            },
          }, null, 2),
        },
      ],
    };
  }

  async listPullRequests(args: any) {
    const { repository, state = 'OPEN', page = 1 } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${this.workspace}/${repository}/pullrequests`,
      {
        params: { state, page }
      }
    );

    const pullRequests: BitbucketPullRequest[] = response.data.values;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            repository,
            state,
            pull_requests: pullRequests.map(pr => ({
              id: pr.id,
              title: pr.title,
              state: pr.state,
              source_branch: pr.source.branch.name,
              destination_branch: pr.destination.branch.name,
              author: pr.author.display_name,
              created_on: pr.created_on,
              updated_on: pr.updated_on,
              url: pr.links.html.href,
            })),
          }, null, 2),
        },
      ],
    };
  }

  async getPullRequest(args: any) {
    const { repository, pull_request_id } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${this.workspace}/${repository}/pullrequests/${pull_request_id}`
    );

    const pullRequest: BitbucketPullRequest = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: pullRequest.id,
            title: pullRequest.title,
            description: pullRequest.description,
            state: pullRequest.state,
            source_branch: pullRequest.source.branch.name,
            destination_branch: pullRequest.destination.branch.name,
            author: {
              display_name: pullRequest.author.display_name,
              username: pullRequest.author.username,
            },
            created_on: pullRequest.created_on,
            updated_on: pullRequest.updated_on,
            url: pullRequest.links.html.href,
          }, null, 2),
        },
      ],
    };
  }

  async approvePullRequest(args: any) {
    const { repository, pull_request_id } = args;

    const response = await this.axiosInstance.post(
      `/repositories/${this.workspace}/${repository}/pullrequests/${pull_request_id}/approve`,
      {} // Empty object as request body
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Pull request #${pull_request_id} approved successfully`,
            repository,
            pull_request_id,
            approval_date: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  async declinePullRequest(args: any) {
    const { repository, pull_request_id, reason } = args;

    const declineData = reason ? { reason } : {};

    const response = await this.axiosInstance.post(
      `/repositories/${this.workspace}/${repository}/pullrequests/${pull_request_id}/decline`,
      declineData
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Pull request #${pull_request_id} declined successfully`,
            repository,
            pull_request_id,
            reason: reason || 'No reason provided',
          }, null, 2),
        },
      ],
    };
  }

  async mergePullRequest(args: any) {
    const {
      repository,
      pull_request_id,
      merge_strategy = 'merge_commit',
      close_source_branch = false,
    } = args;

    const mergeData = {
      type: merge_strategy,
      close_source_branch,
    };

    const response = await this.axiosInstance.post(
      `/repositories/${this.workspace}/${repository}/pullrequests/${pull_request_id}/merge`,
      mergeData
    );

    const mergedPR: BitbucketPullRequest = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Pull request #${pull_request_id} merged successfully`,
            repository,
            pull_request: {
              id: mergedPR.id,
              title: mergedPR.title,
              state: mergedPR.state,
              merge_strategy,
              close_source_branch,
            },
          }, null, 2),
        },
      ],
    };
  }

  async getPullRequestComments(args: any) {
    const { repository, pull_request_id, page = 1, pagelen = 20 } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${this.workspace}/${repository}/pullrequests/${pull_request_id}/comments`,
      {
        params: { page, pagelen }
      }
    );

    const comments: BitbucketComment[] = response.data.values;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            repository,
            pull_request_id,
            comments: comments.map(comment => ({
              id: comment.id,
              content: {
                raw: comment.content.raw,
                html: comment.content.html,
              },
              author: {
                display_name: comment.user.display_name,
                username: comment.user.username,
              },
              created_on: comment.created_on,
              updated_on: comment.updated_on,
              url: comment.links.html.href,
              inline: comment.inline ? {
                path: comment.inline.path,
                from_line: comment.inline.from,
                to_line: comment.inline.to,
              } : null,
            })),
            pagination: {
              page,
              pagelen,
              total: response.data.size || comments.length,
            }
          }, null, 2),
        },
      ],
    };
  }

  async addPullRequestComment(args: any) {
    const { repository, pull_request_id, content } = args;

    const commentData = {
      content: {
        raw: content,
      },
    };

    const response = await this.axiosInstance.post(
      `/repositories/${this.workspace}/${repository}/pullrequests/${pull_request_id}/comments`,
      commentData
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Comment added successfully',
            repository,
            pull_request_id,
            comment: {
              id: response.data.id,
              content: response.data.content.raw,
              author: response.data.user.display_name,
              created_on: response.data.created_on,
            },
          }, null, 2),
        },
      ],
    };
  }

  async updatePullRequest(args: any) {
    const {
      repository,
      pull_request_id,
      title,
      description,
      destination_branch,
      reviewers,
    } = args;

    // Build the update payload with only provided fields
    const updateData: any = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (destination_branch !== undefined) {
      updateData.destination = {
        branch: {
          name: destination_branch,
        },
      };
    }

    if (reviewers !== undefined) {
      // Resolve all reviewers to their canonical form
      updateData.reviewers = await Promise.all(
        reviewers.map((reviewer: any) => resolveReviewer(reviewer, this.axiosInstance, this.workspace))
      );
    }

    const response = await this.axiosInstance.put(
      `/repositories/${this.workspace}/${repository}/pullrequests/${pull_request_id}`,
      updateData
    );

    const pullRequest: BitbucketPullRequest = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Pull request updated successfully',
            pull_request: {
              id: pullRequest.id,
              title: pullRequest.title,
              description: pullRequest.description,
              state: pullRequest.state,
              source_branch: pullRequest.source.branch.name,
              destination_branch: pullRequest.destination.branch.name,
              author: pullRequest.author.display_name,
              url: pullRequest.links.html.href,
              updated_on: pullRequest.updated_on,
            },
          }, null, 2),
        },
      ],
    };
  }
}
