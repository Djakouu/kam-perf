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
        consentStrategy
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

export const GET_ANALYTICS = gql`
  query GetAnalytics($filters: FilterInput) {
    getAnalytics(filters: $filters) {
      summary {
        id
        label
        totalAccounts
        totalDomains
        totalPages
        domainsWith5PlusPages
        domainsByCpu {
          under500
          between500And1000
          between1000And2000
          over2000
        }
      }
      trends {
        id
        label
        data {
          date
          totalAccounts
          totalDomains
          totalPages
          domainsWith5PlusPages
          domainsByCpu {
            under500
            between500And1000
            between1000And2000
            over2000
          }
        }
      }
    }
  }
`;
