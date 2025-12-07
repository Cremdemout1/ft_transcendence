/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   db_queries.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:32:46 by yohan             #+#    #+#             */
/*   Updated: 2025/12/04 15:51:03 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { orm } from '../server';

dotenv.config();

export function checkregexBackend(username: string | null, firstname: string | null, lastname:string | null, email: string | null, password: string | null)
{
    let regexUsername= /^[a-zA-Z0-9_-]{1,15}$/;
    let regexNames= /^[a-zA-Z0-9]{1,20}$/;
    let regexPassword= /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{6,20}$/
    let regexEmail= /^[a-zA-Z0-9._]+@[a-zA-Z0-9.-_]+\.[a-zA-Z]{1,}$/;
    
    if(username)
    {
        if(!regexUsername.test(username))
            throw new Error("username must be of format: max 15 chars, only alphanumeric, - or _");
    }
    if(firstname){
        if(!regexNames.test(firstname))
            throw new Error("first name must be of format: max 20 chars, only alphanumeric");
    }
    if(lastname){
        if(!regexNames.test(lastname))
            throw new Error("last name must be of format: max 20 chars, only alphanumeric");
    }
    if(password){
        if(!regexPassword.test(password))
            throw new Error("password must be of format: 6-20 chars, 1 lowercase + 1 uppercase letter, 1 digit, and 1 special character from this set - [! @ # $ % ^ & *]");
    }
    if(email){
        if(!regexEmail.test(email))
            throw new Error("email must be of format: something@something.something");
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
        const query = this.db.prepare(`INSERT INTO ${process.env.DB_USER_TABLE} (email, password, login_type, provider_id, user_id) VALUES (?, ?, ?, ?, ?)`);
        const userResult = query.run(email, password, login_type, provider_id, user_info_id);
        console.log(userResult);
        return userResult;
    }

    public createUserInfo(firstname: string, lastname: string, username: string): any {
        const query = this.db.prepare(`INSERT INTO ${process.env.DB_USER_INFO_TABLE} (firstname, lastname, username) VALUES (?, ?, ?)`);
        const userResult = query.run(firstname, lastname, username);
        return userResult;
    };

    public updateUser(userId: number, valueToChange: any, newValue: any): any {
        const table = (valueToChange === 'password' || valueToChange === 'twoFactorAuth')
            ? process.env.DB_USER_TABLE : process.env.DB_USER_INFO_TABLE;
        const id = (valueToChange === 'password') ? "user_id" : "id";
        const query = this.db.prepare(`UPDATE ${table} SET ${valueToChange} = ?  WHERE (${id}) = ?`);
        const updatedUser = query.run(newValue, userId);
        return updatedUser;
    }
    //protected getter
    public async getProtectedUser(email:string, password:string) {
        const user = orm.getUserByEmail(email);
        console.log("inside get protected user");
        if (user === -1)
            return user;
        if (!user)
            return (null);
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
