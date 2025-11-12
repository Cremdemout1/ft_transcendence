/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/19 11:21:57 by ycantin           #+#    #+#             */
/*   Updated: 2025/11/11 21:17:59 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

async function checkLoginState(path:string) {
    const token = localStorage.getItem('jwt');
    if (!token) {
        return location.hash = '/#login';
    }
    const res = await fetch(path, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const data = await res.json();
    if (res.ok) {
        //display user info correctly later
        console.log(data);
    } else {
        console.log(`Failed to authenticate user: ${JSON.stringify(data.error) || 'Unknown error'}`);
        return location.hash = '/#login';
    }
}

async function fetchDashboard() {
    checkLoginState("http://192.168.0.188:8080/api/dashboard");
}

export { checkLoginState, fetchDashboard };