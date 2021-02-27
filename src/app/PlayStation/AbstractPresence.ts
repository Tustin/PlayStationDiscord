export default abstract class AbstractPresence
{
    public abstract onlineStatus() : string;

    public abstract titleId() : string;

    public abstract titleName() : string;

    public abstract titleStatus() : string;

    public abstract platform() : string;
}