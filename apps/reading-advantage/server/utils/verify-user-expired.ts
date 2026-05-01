export const isUserExpired = (expiredDate: string): boolean => {
    const currentDate = new Date();
    const expirationDate = new Date(expiredDate);
    return expirationDate < currentDate;
};
