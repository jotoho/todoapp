
import { MongoClient, Collection } from 'mongodb';
import type { Todo } from './todoapp.ts';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/todos';
const MONGO_DB = process.env.MONGO_DB || 'todos';

let db = null;
let collection: Collection<Document> | null = null;
export default class DB {
    connect() {
        return MongoClient.connect(MONGO_URI)
            .then(function (client) {
                db = client.db(MONGO_DB);
                collection = db.collection('todos');
            })
    }

    queryAll() {
        return collection?.find()?.toArray();
    }

    queryById(id: number) {
        // TODO: Implement queryById
    }

    update(id: number, order) {
        // TODO: Implement update
    }

    delete(id) {
        // TODO: Implement delete
    }

    insert(todo: Todo) {
        return collection?.insertOne(todo)
        ?.then(result => {
            todo.id = result.insertedId;
            return todo;
        })
    }
}
