export interface Task {
  name: string;
  workflow: string;
  status: string;
  depends?: string;
}
