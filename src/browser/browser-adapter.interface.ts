export interface BrowserAction {
  type: 'click' | 'fill' | 'select' | 'wait_for' | 'wait_time' | 'scroll';
  selector?: string;
  value?: string;
  ms?: number;
  timeout?: number;
  direction?: 'up' | 'down';
}

export interface BrowserAdapter {
  open(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, value: string): Promise<void>;
  wait(selectorOrMs: string | number): Promise<void>;
  download(selector: string): Promise<string[]>;
  content(): Promise<string>;
  currentUrl(): Promise<string>;
  links(selector: string): Promise<Array<{ title: string; url: string }>>;
  close(): Promise<void>;
}
