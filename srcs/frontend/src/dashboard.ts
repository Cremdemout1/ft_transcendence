/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/19 11:21:57 by ycantin           #+#    #+#             */
/*   Updated: 2025/07/01 12:55:58 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export async function checkLoginState(path:string) {
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
        alert(`Failed to authenticate user: ${JSON.stringify(data.error) || 'Unknown error'}`);
        return location.hash = '/#login';
    }
}

export async function fetchDashboard() {
    checkLoginState("http://localhost:8080/api/dashboard");
}