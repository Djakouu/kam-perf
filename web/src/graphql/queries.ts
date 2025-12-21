import { gql } from '@apollo/client';

export const GET_HIERARCHY = gql`
  query GetHierarchy($filters: FilterInput, $tool: ToolType!) {
    getHierarchy(filters: $filters) {
      id
      name
      country
      tamName
      domains {
        id
        name
        sitecode
        selfHostingUrl
        cookieConsentCode
        pages {
          id
          url
          sitecode
          stats(tool: $tool) {
            date
            desktopCpuAvg
            mobileCpuAvg
          }
        }
      }
    }
  }
`;

export const GET_JOB_STATUS = gql`
  query GetJobStatus($jobId: ID!) {
    getJobStatus(jobId: $jobId) {
      jobId
      status
      progress
      failedReason
      message
    }
  }
`;
