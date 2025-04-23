export const getInfo = async ( access_token: string ) => {
    try {
        const response = await fetch(`https://discord.com/api/users/@me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          })
        const userInfo = await response.json()
        return userInfo
    } catch (err) {
        console.log(err)
        return {}
    }
}

export const getOwnGuilds = async ( access_token: string ) => {
    try {
        const response = await fetch(`https://discord.com/api/users/@me/guilds`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          })
        const ownGuilds = await response.json()
        return ownGuilds
    } catch (err) {
        console.log(err)
        return []
    }
}

export const getConnnections = async ( access_token: string ) => {
    try {
        const response = await fetch(`https://discord.com/api/users/@me/connections`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          })
        const connections = await response.json()
        return connections
    } catch (err) {
        console.log(err)
        return []
    }
}

export const getIpInfo = async ( ip: string ) => {
    try {
        const response = await fetch(`https://ipinfo.io/${ip}/json`, {
            method: "GET",
            headers: {
              "Accept": "application/json",
            },
          })
          
        if (!response.ok) {
            throw new Error(`failed to get ip info: ${response.status}`);
        }
        
        const ipInfo = await response.json()
        return ipInfo
    } catch (err) {
        console.log(err)
        return {
            country: "N/A", 
            city: "N/A", 
            region: "N/A", 
            loc: "N/A"
        }
    }
}