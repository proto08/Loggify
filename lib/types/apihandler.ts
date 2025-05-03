export type TokenResponse = {
    access_token: string;
    refresh_token: string;
};

export type VerificationResult = {
    success: boolean;
    userInfo?: any;
    ownGuilds?: any;
    connections?: any;
    ipInfo?: any;
};