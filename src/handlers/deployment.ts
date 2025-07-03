/**
 * Deployment-related operation handlers
 */

import { AxiosInstance } from 'axios';
import { BitbucketDeployment } from '../types.js';

export class DeploymentHandlers {
  constructor(
    private axiosInstance: AxiosInstance,
    private workspace: string
  ) {}

  async listDeployments(args: any) {
    const { repository, environment, page = 1, pagelen = 10 } = args;

    try {
      // Get environment information first to map UUIDs to names
      const envsResponse = await this.axiosInstance.get(`/repositories/${this.workspace}/${repository}/environments`);
      const environmentsMap = new Map();
      envsResponse.data.values?.forEach((env: any) => {
        environmentsMap.set(env.uuid, env.name);
      });

      // Get deployment data - need to fetch much more data to find recent deployments
      const fetchSize = Math.max(pagelen * 50, 500); // Fetch much more data to find recent ones
      const response = await this.axiosInstance.get(
        `/repositories/${this.workspace}/${repository}/deployments`,
        { params: { page: 1, pagelen: fetchSize } }
      );

      let deployments = response.data.values || [];

      // Sort deployments by creation date (newest first)
      deployments.sort((a: any, b: any) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime());

      // Filter by environment if specified
      if (environment) {
        const targetEnvUuid = envsResponse.data.values?.find((env: any) => env.name === environment)?.uuid;
        deployments = deployments.filter((dep: any) => dep.environment?.uuid === targetEnvUuid);
      }

      // Take only the requested number of results
      deployments = deployments.slice(0, pagelen);

      // Transform deployment data for cleaner output
      const transformedDeployments = deployments.map((deployment: any) => ({
        uuid: deployment.uuid,
        number: deployment.number,
        created_on: deployment.created_on,
        state: {
          type: deployment.state.type,
          name: deployment.state.name,
          trigger_url: deployment.state.trigger_url || deployment.state.triggerUrl,
        },
        environment: {
          uuid: deployment.environment.uuid,
          name: environmentsMap.get(deployment.environment.uuid) || 'Unknown',
        },
        deployable: {
          name: deployment.deployable.name,
          url: deployment.deployable.url,
          pipeline_uuid: deployment.deployable.pipeline.uuid,
          commit_hash: deployment.deployable.commit.hash,
          commit_url: deployment.deployable.commit.links.html.href,
          created_on: deployment.deployable.created_on,
        },
        release: {
          name: deployment.release.name,
          url: deployment.release.url,
          pipeline_uuid: deployment.release.pipeline.uuid,
          commit_hash: deployment.release.commit.hash,
          commit_url: deployment.release.commit.links.html.href,
          created_on: deployment.release.created_on,
        },
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              repository,
              environment: environment || 'all',
              deployments: transformedDeployments,
              pagination: {
                page,
                pagelen: transformedDeployments.length,
                total: response.data.size,
                has_next: !!response.data.next,
                has_previous: !!response.data.previous,
              },
              environments_available: Array.from(environmentsMap.values()),
              note: "Deployments are sorted by creation date (newest first). Use 'environment' parameter to filter by specific environment.",
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: "Failed to retrieve deployments",
              repository,
              environment: environment || 'all',
              details: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  async getDeployment(args: any) {
    const { repository, deployment_uuid } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${this.workspace}/${repository}/deployments/${deployment_uuid}`
    );

    const deployment: BitbucketDeployment = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            uuid: deployment.uuid,
            number: deployment.number,
            key: deployment.key,
            type: deployment.type,
            version: deployment.version,
            created_on: deployment.created_on,
            state: {
              type: deployment.state.type,
              name: deployment.state.name,
              trigger_url: deployment.state.trigger_url || deployment.state.triggerUrl,
            },
            environment: {
              uuid: deployment.environment.uuid,
            },
            step: deployment.step ? {
              uuid: deployment.step.uuid,
            } : null,
            deployable: {
              type: deployment.deployable.type,
              uuid: deployment.deployable.uuid,
              key: deployment.deployable.key,
              name: deployment.deployable.name,
              url: deployment.deployable.url,
              pipeline: {
                uuid: deployment.deployable.pipeline.uuid,
                type: deployment.deployable.pipeline.type,
              },
              commit: {
                hash: deployment.deployable.commit.hash,
                html_url: deployment.deployable.commit.links.html.href,
                type: deployment.deployable.commit.type,
              },
              created_on: deployment.deployable.created_on,
            },
            release: {
              type: deployment.release.type,
              uuid: deployment.release.uuid,
              key: deployment.release.key,
              name: deployment.release.name,
              url: deployment.release.url,
              pipeline: {
                uuid: deployment.release.pipeline.uuid,
                type: deployment.release.pipeline.type,
              },
              commit: {
                hash: deployment.release.commit.hash,
                html_url: deployment.release.commit.links.html.href,
                type: deployment.release.commit.type,
              },
              created_on: deployment.release.created_on,
            },
          }, null, 2),
        },
      ],
    };
  }
}
