export type Todo = {
  _id: BigInt;
  title: string;
  description: string;
  /** time in ms since unix epoch. must be positive */
  duetime: number | null;
  isDone: boolean;
};
