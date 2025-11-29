/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   db_queries.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:32:46 by yohan             #+#    #+#             */
/*   Updated: 2025/07/04 09:43:07 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { orm } from '../server';

dotenv.config();
// CREATE TABLE IF NOT EXISTS $DB_USER_INFO_TABLE (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   firstname TEXT NOT NULL,
//   lastname TEXT NOT NULL,
//   username TEXT UNIQUE NOT NULL
// );

// 		-- We declare login_type as TEXT but restrict values
// 		-- We allow empty password when login is handled by third party Oauth

// CREATE TABLE IF NOT EXISTS users (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   user_id INTEGER NOT NULL,
//   provider_id TEXT NOT NULL,
//   login_type TEXT NOT NULL CHECK (login_type IN ('google', '42', 'local')),
//   password TEXT,
//   email TEXT NOT NULL,
//   twoFactorAuth INTEGER DEFAULT 0,
//   UNIQUE (login_type, provider_id),
//   UNIQUE (email, login_type),
//   FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
//   CHECK (
//     (login_type = 'local' AND password IS NOT NULL AND password <> '')
//     OR login_type <> 'local'
//   )
// );

export function checkregexBackend(username: string | null, firstname: string | null, lastname:string | null, email: string | null, password: string | null)
{
    let regexUsername= /^[a-zA-Z0-9_]{1,15}$/;
    let regexNames= /^[a-zA-Z0-9]{1,20}$/;
    let regexPassword= /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
    let regexEmail= /^[a-zA-Z0-9._]+@[a-zA-Z0-9.-_]+\.[a-zA-Z]{2,}$/;
    
    if(username)
    {
        if(!regexUsername.test(username))
            throw new Error("username has an invalid format/characters");
    }
    if(firstname){
        if(!regexNames.test(firstname))
            throw new Error("first name has an invalid format/characters");
    }
    if(lastname){
        if(!regexNames.test(lastname))
            throw new Error("last name has an invalid format/characters");
    }
    if(password){
        if(!regexPassword.test(password))
            throw new Error("password has an invalid format/characters");
    }
    if(email){
        if(!regexEmail.test(email))
            throw new Error("email has an invalid format/characters");
    }
}

export default class ORM { //pass hashed password here

    private db: any;

    constructor(db_name: string | undefined) {
        if (!db_name)
            throw new Error("custom ORM could not initialize: Name of database not found in Env");
        const name = db_name.slice(5);
        console.log(name);
        this.db = new Database(name);
        if (!this.db)
            throw new Error("custom ORM could not initialize: Database not found");
    }

    public getUserInfoTable(user_id: number) {
        return this.db.prepare(`SELECT * FROM ${process.env.DB_USER_INFO_TABLE} WHERE id = ?`).get(user_id);
    }

    public getUserByEmail(email: string): any {

        return this.db.prepare(`SELECT * FROM ${process.env.DB_USER_TABLE} WHERE email = ?`).get(email);
    }

    public getUserByID(user_id: number): any {
        return this.db.prepare(`SELECT * FROM ${process.env.DB_USER_TABLE} WHERE user_id = ?`).get(user_id);
    }


    public getUserByUsername(username: string): any {
        return this.db.prepare(`SELECT * FROM ${process.env.DB_USER_INFO_TABLE} WHERE username = ?`).get(username);
    }

    public createUser(email: string, password: string, provider_id: string, login_type: string, user_info_id: number): any {
        try {
            checkregexBackend(null, null, null, email, null);
        }
        catch(error) {
            return -1;
        }
        const query = this.db.prepare(`INSERT INTO ${process.env.DB_USER_TABLE} (email, password, login_type, provider_id, user_id) VALUES (?, ?, ?, ?, ?)`);
        const userResult = query.run(email, password, login_type, provider_id, user_info_id);
        console.log(userResult);
        return userResult;
    }

    public createUserInfo(firstname: string, lastname: string, username: string): any {
        try{
        checkregexBackend(username, firstname, lastname, null, null);
        }
        catch(error) {
            return -1;
        }
        const query = this.db.prepare(`INSERT INTO ${process.env.DB_USER_INFO_TABLE} (firstname, lastname, username) VALUES (?, ?, ?)`);
        const userResult = query.run(firstname, lastname, username);
        return userResult;
    };

    public updateUser(userId: number, valueToChange: any, newValue: any): any {
        const table = (valueToChange === 'password' || valueToChange === 'twoFactorAuth')
            ? process.env.DB_USER_TABLE : process.env.DB_USER_INFO_TABLE;
        const id = (valueToChange === 'password') ? "user_id" : "id";
        try{
            if(valueToChange=="username")
                checkregexBackend(newValue, null, null, null, null);
            else if(valueToChange=="firstname")
                checkregexBackend(null, newValue, null, null, null);
            else if(valueToChange=="lastname")
                checkregexBackend(null, null, newValue, null, null);
        }
        catch(error)
        {
            return -1;
        }
        const query = this.db.prepare(`UPDATE ${table} SET ${valueToChange} = ?  WHERE (${id}) = ?`);
        const updatedUser = query.run(newValue, userId);
        return updatedUser;
    }
    //protected getter
    public async getProtectedUser(email:string, password:string) {
        const user = orm.getUserByEmail(email);
        console.log("inside get protected user");
        console.log(user);
        const userPassword = user ? user.password : null;
        console.log(userPassword);
        const validPassword = await bcrypt.compare(password, userPassword);
        if (!validPassword){
            console.log("urmomma");
            return null;
        }
        return user;
    }
}
