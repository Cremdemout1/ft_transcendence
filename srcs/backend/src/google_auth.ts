/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   google_auth.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 20:45:38 by ycantin           #+#    #+#             */
/*   Updated: 2025/06/19 15:16:27 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import querystring from 'querystring';
import http from 'http';
import { FastifyInstance } from 'fastify';

interface userInfo
{
  "iss": string,
  "sub": string,
  "email": string,
  "email_verified": boolean,
  "name": string,
  "picture": string,
  "given_name": string,
  "family_name": string,
  "iat": number,
  "exp": number,
  "aud": string,
};

const googleId = process.env.GOOGLE_ID || 'ERROR';
const googleSecret = process.env.GOOGLE_SECRET || 'ERROR_SECRET';

function getAuthURL() {
    const params = new URLSearchParams({
        client_id: googleId,
        redirect_uri: 'http://localhost:8080/auth/google/callback',
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function exchangeCodeForToken(code:string): Promise<string>{
    return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
        code,
        client_id: googleId,
        client_secret: googleSecret,
        redirect_uri: 'http://localhost:8080/auth/google/callback',
        grant_type: 'authorization_code',
    });

    const options = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
        },
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log("JSON:  ", json);
                const idToken = json.id_token;
                if (!idToken)
                    return reject(new Error('No id_token in response'));
                resolve(idToken);
            }
            catch(err) {
                reject(err);
            }
        });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
    });
}

async function decodeToken(token: string, fastify: FastifyInstance): Promise<userInfo>{
    return new Promise((resolve, reject) => {
        try {
            const firstDecode = fastify.jwt.decode(token);
            if (!firstDecode || typeof firstDecode !== 'object') {
                return reject(new Error('Invalid token response'));
            }

            const idToken = (firstDecode as any).id_token;
            if (!idToken || typeof idToken !== 'string') {
                return reject(new Error('No id_token found'));
            }
            
            const userInfo = fastify.jwt.decode(idToken);
            if (!userInfo || typeof userInfo !== 'object')
                return reject(new Error('Invalid token'));
            
            resolve(userInfo as userInfo);
        }
        catch(err) {
            reject(err);
        }
    });  
}

export  { exchangeCodeForToken, getAuthURL, decodeToken };