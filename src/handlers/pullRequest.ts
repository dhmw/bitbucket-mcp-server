/**
 * Pull Request-related operation handlers
 */

import { AxiosInstance } from 'axios';
import { BitbucketPullRequest, BitbucketComment } from '../types.js';

export class PullRequestHandlers {
  constructor(
    private axiosInstance: AxiosInstance,
    private workspace: string,
    private username: string
  ) {}

  async createPullRequest(args: any) {
    const {
      repository,
      title,
      description = '',
      source_branch,
      destination_branch = 'main',
      reviewers = [],
    } = args;

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
      reviewers: reviewers.map((username: string) => ({ username })),
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
            approved_by: this.username,
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
            declined_by: this.username,
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
}
