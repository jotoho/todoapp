import { MongoClient, ObjectId } from "mongodb";
import type { Db, Collection, Document, InsertOneResult, EnhancedOmit, DeleteResult } from "mongodb";
import type { Todo } from "./todoapp.ts";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/todos";
const MONGO_DB = process.env.MONGO_DB || "todos";

/** Variant of Todo with _id being ObjectId instead of number */
export type TodoWithObjectId = EnhancedOmit<Todo, "_id"> & { _id: ObjectId };

export const convertToDB = (todo: Todo): TodoWithObjectId => {
  return {
    ...todo,
    _id: ObjectId.createFromTime(todo._id),
  };
};

export const convertFromDB = (todo: TodoWithObjectId): Todo => {
  return {
    ...todo,
    _id: Number.parseInt(todo._id.inspect(), 16),
  };
};

export default class DB {
  client?: MongoClient = undefined;
  db?: Db = undefined;
  collection?: Collection<TodoWithObjectId> = undefined;
  initializationPromise?: Promise<void> = undefined;
  initialized: boolean = false;

  constructor() {
    let failure = false;
    const successFn = ((client: MongoClient) => {
      this.client = client;
      this.db = client.db(MONGO_DB);
      this.collection = this.db.collection("todos");
      this.initialized = true;
    }).bind(this);
    const errorFn = () => {
      failure = true;
    };
    this.initializationPromise = MongoClient.connect(MONGO_URI)
      .then(successFn)
      .catch(errorFn);
  }

  isReady() {
    return this.initialized;
  }

  async waitUntilReady(): Promise<boolean> {
    if (this.initialized) {
      return this.initialized;
    } else {
      await this.initializationPromise;
      return this.initialized;
    }
  }

  queryAll(): Promise<Array<Todo>> {
    return this.collection?.find()?.toArray().then(arr => arr.map(convertFromDB)) ?? Promise.resolve([]);
  }

  queryById(id: number): Promise<Todo | null> {
    return this.collection
              ?.findOne<TodoWithObjectId>({ _id: ObjectId.createFromTime(id) })
              ?.then(dbtodo => dbtodo ? convertFromDB(dbtodo) : dbtodo) ?? Promise.resolve(null);
  }

  update(id: number, replacement: Todo): Promise<Todo | null> {
    return this.collection
      ?.findOneAndReplace({ _id: ObjectId.createFromTime(id) }, convertToDB(replacement))
      .then(result => result ? convertFromDB(result) : result) ?? Promise.resolve(null);
  }

  delete(id: number): Promise<DeleteResult | void> {
    return this.collection?.deleteOne({ _id: ObjectId.createFromTime(id) }) ?? Promise.resolve();
  }

  insert(todo: Todo) {
    if (this.collection === undefined) {
      throw "Attempted to insert document, when DB has not been properly initialized";
    }
    const successFn = (result: InsertOneResult<Document>) => {
      const newTodo = convertFromDB({ ...todo, _id: result.insertedId });
      return newTodo;
    };
    return this.collection
      .insertOne(convertToDB(todo))
      .then(successFn);
  }
}
