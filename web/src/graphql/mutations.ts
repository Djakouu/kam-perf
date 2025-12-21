import { gql } from '@apollo/client';

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      id
      name
      country
      tamName
    }
  }
`;

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($id: ID!, $input: UpdateAccountInput!) {
    updateAccount(id: $id, input: $input) {
      id
      name
      country
      tamName
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: ID!) {
    deleteAccount(id: $id)
  }
`;

export const ADD_COMMENT = gql`
  mutation AddComment($input: AddCommentInput!) {
    addComment(input: $input) {
      id
      text
      date
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id)
  }
`;

export const CREATE_DOMAIN = gql`
  mutation CreateDomain($input: CreateDomainInput!) {
    createDomain(input: $input) {
      id
      name
      sitecode
      selfHostingUrl
      cookieConsentCode
    }
  }
`;

export const UPDATE_DOMAIN = gql`
  mutation UpdateDomain($id: ID!, $input: UpdateDomainInput!) {
    updateDomain(id: $id, input: $input) {
      id
      name
      sitecode
      selfHostingUrl
      cookieConsentCode
    }
  }
`;

export const DELETE_DOMAIN = gql`
  mutation DeleteDomain($id: ID!) {
    deleteDomain(id: $id)
  }
`;

export const CREATE_PAGE = gql`
  mutation CreatePage($input: CreatePageInput!) {
    createPage(input: $input) {
      id
      url
      sitecode
    }
  }
`;

export const UPDATE_PAGE = gql`
  mutation UpdatePage($id: ID!, $input: UpdatePageInput!) {
    updatePage(id: $id, input: $input) {
      id
      url
      sitecode
    }
  }
`;

export const DELETE_PAGE = gql`
  mutation DeletePage($id: ID!) {
    deletePage(id: $id)
  }
`;

export const TRIGGER_ANALYSIS = gql`
  mutation TriggerAnalysis($pageId: ID!, $tool: ToolType!) {
    triggerAnalysis(pageId: $pageId, tool: $tool) {
      jobId
      status
    }
  }
`;

export const CANCEL_ANALYSIS = gql`
  mutation CancelAnalysis($jobId: ID!) {
    cancelAnalysis(jobId: $jobId)
  }
`;
