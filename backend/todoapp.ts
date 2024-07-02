export type Todo = {
  _id: number;
  title: string;
  description: string;
  /** time in ms since unix epoch. must be positive */
  duetime: number | null;
  isDone: boolean;
};
