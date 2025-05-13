import { VPNData } from "../types/userdata"

export const isAnonymouse = async (ip: string): Promise<boolean> => {
    try {
        const response = await fetch(`https://ipinfo.io/widget/demo/${ip}?dataset=proxy-vpn-detection`)
        const data = await response.json() as VPNData
        if (data.data.vpn || data.data.proxy || data.data.tor || data.data.relay || data.data.hosting) {
            return true
        }
        return false
    } catch (error) {
        console.log(error)
        return false
    }
}
