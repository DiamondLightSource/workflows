export interface Task {
  name: string;
  workflow: string;
  status: string;
  depends?: string;
}

export interface TaskNode extends Task {
  children?: TaskNode[];
}
