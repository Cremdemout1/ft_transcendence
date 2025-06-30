/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/19 11:21:57 by ycantin           #+#    #+#             */
/*   Updated: 2025/06/30 14:36:27 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export async function fetchDashboard() {

    const token = localStorage.getItem('jwt');
    if (!token) {
        return location.hash = '/#login';
    }
    const res = await fetch("http://localhost:8080/api/dashboard", {
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