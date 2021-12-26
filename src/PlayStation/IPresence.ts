export default interface IPresence<T>
{
    presenceData : T;

    onlineStatus() : string;

    title() : object;
}