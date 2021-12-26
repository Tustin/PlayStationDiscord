export default interface IProfileModel<T>
{
    profileData : T;

    onlineId() : string;

    avatarUrl() : string;
}