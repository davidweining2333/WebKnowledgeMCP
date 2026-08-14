export interface InteractiveControl {
  selector: string;
  label: string;
  tag: string;
}

export interface InteractiveField {
  selector: string;
  label: string;
  inputType: string;
}

export interface BrowserAdapter {
  open(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, value: string): Promise<void>;
  wait(selectorOrMs: string | number): Promise<void>;
  download(selector: string): Promise<string[]>;
  fetchBuffer(url: string): Promise<Buffer>;
  content(): Promise<string>;
  currentUrl(): Promise<string>;
  links(selector: string): Promise<Array<{ title: string; url: string }>>;
  interactiveControls(): Promise<InteractiveControl[]>;
  interactiveFields(): Promise<InteractiveField[]>;
  close(): Promise<void>;
}
