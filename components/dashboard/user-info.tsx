import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Earth, Info, MapPin, MonitorSmartphone, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { UserData } from '@/lib/types/userdata'
import { getAddress, getIpInfo } from '@/lib/functions/userdata'

const UserInfo = async ({ user }: { user: UserData }) => {
    const ipInfo = await getIpInfo(user.ip)
    const address  = await getAddress(user.gps?.latitude?? 0, user.gps?.longitude?? 0)
    
  return (
    <Popover>
        <PopoverTrigger className="p-3 text-center hover:bg-muted/50 rounded-md">
            <div className="flex items-center justify-center">
                <Info className="text-center cursor-pointer" size={20}/>
            </div>
        </PopoverTrigger>
        <PopoverContent className="w-120 h-200 mr-30" align="center" side="top">
            <div className="w-full h-full p-4 overflow-y-auto">
                <div className="flex items-center justify-center mb-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={`https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar_id}.png`} />
                        <AvatarFallback className="text-xl">
                            {user.global_name?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex flex-col items-center justify-center mb-6">
                    <h3 className="text-xl font-bold">{user.global_name}</h3>
                    <p className="text-muted-foreground">@{user.user_name}</p>
                </div>
                <div className="space-y-4">
                    <div className="border-b pb-2">
                        <h4 className="flex font-semibold mb-2"><span className="mr-2"><User /></span>UserInfo</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm pl-3">
                            <p className="text-muted-foreground">User ID:</p>
                            <p className="font-mono">{user.user_id}</p>
                            <p className="text-muted-foreground">Email:</p>
                            <p>{user.email}</p>
                            <p className="text-muted-foreground">MFA_Enabled:</p>
                            <p>{user.mfa_enabled ? "Yes" : "No"}</p>
                            <p className="text-muted-foreground">Locale</p>
                            <p>{user.locale}</p>
                            <p className="text-muted-foreground">isVerified:</p>
                            <p>{user.verified ? "Yes" : "No"}</p>
                            
                        </div>
                    </div>
                    <div className="border-b pb-2">
                        <h4 className="flex font-semibold mb-2"><span className="mr-2"><MonitorSmartphone /></span>Device Info</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm pl-3">
                            <p className="text-muted-foreground">IP Address:</p>
                            <p className="font-mono">{user.ip}</p>
                            <p className="text-muted-foreground">User Agent:</p>
                            <p className="font-mono">{user.user_agent}</p>
                        </div>
                    </div>
                    <div className="border-b pb-2">
                        <h4 className="flex font-semibold mb-2"><span className="mr-2"><Earth /></span>Location from IP</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm pl-3">
                            <p className="text-muted-foreground">Country:</p>
                            <p className="font-mono">{ipInfo.country}</p>
                            <p className="text-muted-foreground">Region:</p>
                            <p className="font-mono">{ipInfo.region}</p>
                            <p className="text-muted-foreground">City:</p>
                            <p className="font-mono">{ipInfo.city}</p>
                            <p className="text-muted-foreground">ISP:</p>
                            <p className="font-mono">{ipInfo.org}</p>
                        </div>
                    </div>
                    <div className="border-b pb-2">
                        <h4 className="flex font-semibold mb-2"><span className="mr-2"><MapPin /></span>GPS Info</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm pl-3">
                            <p className="text-muted-foreground">Latitude:</p>
                            <p className="font-mono">{user.gps?.latitude ?? 0}</p>
                            <p className="text-muted-foreground">Longitude:</p>
                            <p className="font-mono">{user.gps?.longitude ?? 0}</p>
                            <p className="text-muted-foreground">Accuracy:</p>
                            <p className="font-mono">{user.gps?.accuracy ?? 0}</p>
                            <p className="text-muted-foreground">Address:</p>
                            <p className="font-mono">{address}</p>
                        </div>
                    </div>
                    <div className="border-b pb-2">
                        <h4 className="flex font-semibold mb-2"><span className="mr-2"><MapPin /></span>Map</h4>
                        <div className="flex justify-center items-center w-full h-[300px]">
                            <iframe 
                                className="w-full h-full rounded-lg border border-gray-200" 
                                src={`https://www.google.com/maps/embed/v1/search?q=${user.gps?.latitude},${user.gps?.longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`}
                            ></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </PopoverContent>
    </Popover>
  )
}

export default UserInfo