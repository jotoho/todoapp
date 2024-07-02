import { MongoClient, ObjectId } from "mongodb";
import type {
  Db,
  Collection,
  Document,
  InsertOneResult,
  EnhancedOmit,
  DeleteResult,
} from "mongodb";
import type { Todo } from "./todoapp.ts";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/todos";
const MONGO_DB = process.env.MONGO_DB || "todos";

/** Variant of Todo with _id being ObjectId instead of number */
export type TodoWithObjectId = EnhancedOmit<Todo, "_id"> & { _id?: ObjectId };

export const bigIntToObjectId = (id: BigInt): ObjectId => {
  return ObjectId.createFromHexString(id.toString(16).padStart(24, '0'));
};

export const objectIdToBigInt = (id: ObjectId): BigInt => {
  return BigInt("0x" + id.toHexString());
};

export const convertToDB = (todo: Todo): TodoWithObjectId => {
  return {
    ...todo,
    _id: todo._id ? bigIntToObjectId(todo._id): undefined,
  };
};

export const convertFromDB = (todo: TodoWithObjectId): Todo => {
  console.debug(todo);
  if (todo._id === undefined) {
    throw "todos received from DB must have ids";
  }
  const intermediary = { ...todo };
  delete intermediary._id;
  const returnObj = { ...intermediary, _id: objectIdToBigInt(todo._id) };
  console.debug(returnObj);
  return returnObj;
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
    return (
      this.collection
        ?.find?.()
        ?.toArray?.()
        ?.then?.((arr) => {
          console.debug(arr);
          const fixedArr = arr.map(convertFromDB);
          console.debug(fixedArr);
          return fixedArr;
        }) ??
      Promise.reject("DB is not open")
    );
  }

  queryById(id: BigInt): Promise<Todo | null> {
    return (
      this.collection
        ?.findOne<TodoWithObjectId>?.({ _id: bigIntToObjectId(id) })
        ?.then?.((dbtodo) => (dbtodo ? convertFromDB(dbtodo) : dbtodo)) ??
      Promise.reject("DB is not open")
    );
  }

  update(id: BigInt, replacement: Todo): Promise<Todo | null> {
    let replacementInt: any = { ...replacement };
    delete replacementInt._id;
    return (
      this.collection
        ?.findOneAndUpdate?.(
          { _id: bigIntToObjectId(id) },
          { "$set": convertToDB(replacementInt) },
          { upsert: true }
        )
        ?.then?.((result) => (result ? convertFromDB(result) : result)) ??
      Promise.reject("DB is not open")
    );
  }

  delete(id: BigInt): Promise<DeleteResult | void> {
    return (
      this.collection?.deleteOne?.({ _id: bigIntToObjectId(id) }) ??
      Promise.reject("DB is not open")
    );
  }

  insert(todo: Todo): Promise<Todo> {
    if (this.collection === undefined) {
      throw "Attempted to insert document, when DB has not been properly initialized";
    }
    const successFn = async (result: InsertOneResult<Document>) => {
      if (result.insertedId !== null) {
        const inserted: any = {
          ...todo
        };
        inserted._id = result.insertedId;
        return convertFromDB(inserted);
      }
      else {
        const filter: any = { ...todo };
        delete filter._id;
        const addedElement = await this.collection!.findOne(filter, { projection: { _id: 1 } });
        if (addedElement !== null) {
          return convertFromDB(addedElement);
        }
        else {
          throw "Cannot find document that was added to database";
        }
      }
    };
    return (
      this.collection?.insertOne?.(convertToDB(todo))?.then?.(successFn) ??
      Promise.reject("DB is not open")
    );
  }

  count(id: BigInt): Promise<number> {
    return this?.collection?.countDocuments?.({ _id: bigIntToObjectId(id) }) ?? Promise.reject("DB is not open");
  }
}
