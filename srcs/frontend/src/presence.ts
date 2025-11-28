/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   presence.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/11/10 15:14:18 by gcapa-pe          #+#    #+#             */
/*   Updated: 2025/11/10 15:14:21 by gcapa-pe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


function decodeJwt(token: string): any | null {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function emitPresence() {
  const jwt = sessionStorage.getItem('jwt');
  if (!jwt) return;
  const username = decodeJwt(jwt)?.username;
  if (!username) return;
  // Ensure the game socket is connected (dynamically import matchmaking)
  const mod = await import('./matchmaking');
  const socket = (mod as any).socket as import('socket.io-client').Socket;
  if (socket && socket.connected) {
    socket.emit('presence:identify', { username });
  } else if (socket) {
    socket.once('connect', () => socket.emit('presence:identify', { username }));
    socket.connect();
  }
}