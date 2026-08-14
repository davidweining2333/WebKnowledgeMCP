export type LoginType = 'cookie' | 'password' | 'oauth' | 'none';

export interface Attachment {
  filename: string;
  type: string;
  url: string;
  localPath?: string;
}

export interface KnowledgeDocument {
  title: string;
  url: string;
  publishTime: string | null;
  content: string;
  attachments: Attachment[];
}

export type WorkflowParameter = 'query' | 'from' | 'to';

export type SiteWorkflowAction =
  | { type: 'click'; selector: string; label?: string }
  | { type: 'fill'; selector: string; parameter: WorkflowParameter; label?: string; inputType?: string }
  | { type: 'wait_for'; selector: string; timeout?: number }
  | { type: 'wait_time'; ms: number };

export interface SiteProfile {
  url: string;
  loginRequired: boolean;
  loginType: LoginType;
  entrySelector: string;
  articleSelector: string;
  nextPageSelector: string;
  attachmentSelector: string;
  workflowVersion: number;
  workflowActions?: SiteWorkflowAction[];
  siteName: string;
  feedType: 'static' | 'interactive';
}

export interface SiteSummary {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface CrawlRequest {
  site: string;
  query?: string;
  from?: string;
  to?: string;
  limit?: number;
}
