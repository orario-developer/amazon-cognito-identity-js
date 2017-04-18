/*!
 * Copyright 2016 Amazon.com,
 * Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the
 * License. A copy of the License is located at
 *
 *     http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, express or implied. See the License
 * for the specific language governing permissions and
 * limitations under the License.
 */

let sqlDataMemory = {},
  _db = null;

/** @class */
class SQLiteStorage {

  constructor(){
    if(typeof PouchDB === 'undefined')
      throw new Error('PouchDB is undefined.');

    console.log('SQLiteStorage will be used.');
    _db = new PouchDB('cognito', {adapter: 'websql'})
    _db.info().then(this.init)

  }

  init(){
    var _opt = {
      include_docs: true,
      attachments: true,
      startkey: "cognito-", // Prefix search
      endkey: "cognito-\uffff"
    };
    return _db.allDocs(_opt)
      .then(function (res) {
        sqlDataMemory = res.rows.map(function (row) {
          return row.doc;
        });
      })
  }


  getItem(key){
    var result = this.get(key);
    return result ? result.value : null;
  }

  get(key){
    var result = null;

    for (var i = 0; i < sqlDataMemory.length; i++) {
      if (sqlDataMemory[i].key == key) {
        result = sqlDataMemory[i];
        break;
      }
    }
    console.log('============= get =================');
    console.log('key', key);
    console.log(JSON.stringify(result));
    return result;
  }

  setItem(key, value) {
    var data = this.get(key);
    var isEditMode = !!data;
    if (isEditMode) {
      // 編集
      console.log('!!!!!!!!!!! set !!!!!!!!!!!!!!!!');
      console.log(JSON.stringify(data));
      data.value = value;
    } else {
      // 新規作成
      data = {
        _id: "cognito-" + key,
        type: "cognito",
        key: key,
        value: value
      };
    }

    // DB
    return _db.put(data)
      .then(function (res) {
        console.log("cognito: setItem 成功");
        console.log(res);
        data._rev = res.rev; // revの更新
        if (!isEditMode) sqlDataMemory.push(data);
      })
  }

  removeItem(key){
    var data = this.get(key);
    if(!data)
      return;

    data._deleted = true;

    return _db.put(data).then(function (res) {
      console.log("cognito: removeItem 成功");
      console.log(JSON.stringify(res));

      for (var i = 0; i < sqlDataMemory.length; i++) {
        if (sqlDataMemory[i].key == key) {
          sqlDataMemory.splice(i,1);
          break;
        }
      }
    });

  }

}
/** @class */
class MemoryStorage {

  /**
   * This is used to set a specific item in storage
   * @param {string} key - the key for the item
   * @param {object} value - the value
   * @returns {string} value that was set
   */
  static setItem(key, value) {
    dataMemory[key] = value;
    return dataMemory[key];
  }

  /**
   * This is used to get a specific key from storage
   * @param {string} key - the key for the item
   * This is used to clear the storage
   * @returns {string} the data item
   */
  static getItem(key) {
    return Object.prototype.hasOwnProperty.call(dataMemory, key) ? dataMemory[key] : undefined;
  }

  /**
   * This is used to remove an item from storage
   * @param {string} key - the key being set
   * @returns {string} value - value that was deleted
   */
  static removeItem(key) {
    return delete dataMemory[key];
  }

  /**
   * This is used to clear the storage
   * @returns {string} nothing
   */
  static clear() {
    dataMemory = {};
    return dataMemory;
  }
}

/** @class */
export default class StorageHelper {

  /**
   * This is used to get a storage object
   * @returns {object} the storage
   */
  constructor() {
    try{
      // SQLite
      this.storageWindow = new SQLiteStorage();
    }catch(e){
      try {
        // LocalStorage
        this.storageWindow = window.localStorage;
        this.storageWindow.setItem('aws.cognito.test-ls', 1);
        this.storageWindow.removeItem('aws.cognito.test-ls');
        console.log('localStorage will be used.');
      } catch (exception) {
        // On Memory
        this.storageWindow = MemoryStorage;
        console.log('MemoryStorage will be used.');
      }
    }
  }

  /**
   * This is used to return the storage
   * @returns {object} the storage
   */
  getStorage() {
    return this.storageWindow;
  }
}
