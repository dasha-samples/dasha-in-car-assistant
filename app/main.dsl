import "./commonDialogue.dsl";

context
{
    input phone: string,
    currentTarget: string = "",
    currentAction: string = "",
    newInfo: boolean = false;
    forgetTime: number = 15000;
    yesNoEnabled: boolean = false;
    lastIdleTime: number = 0;
}

type CallResultExtended =
{
    success: boolean; details: string; action: string; target: string;
}
;

type CallResult =
{
    success: boolean; details: string;
}
;

//Callbacks
external function command(target: string, action: string): CallResult;
external function checkCommandUpdate(): CallResultExtended;


preprocessor digression light
{
    conditions { on #messageHasIntent("light") priority 2000; }
    do
    {
        set $newInfo = true;
        set $currentTarget = "light";  
        return;
    }
}

preprocessor digression targetFiller
{
    conditions
    {
        on #messageHasIntent("conditioner") || #messageHasIntent("trunk") || #messageHasIntent("snow mode") priority 2000;
    }
    do
    {
        set $newInfo = true;
        if (#messageHasIntent("conditioner")) set $currentTarget = "conditioner";
        if (#messageHasIntent("trunk")) set $currentTarget = "trunk";
        if (#messageHasIntent("snow mode")) set $currentTarget = "snow mode";    
        return;
    }
}

preprocessor digression actionFiller
{
    conditions
    {
        on #messageHasIntent("turn on") || #messageHasIntent("turn off") || #messageHasIntent("open") || #messageHasIntent("close") priority 2000;
    }
    do
    {
        set $newInfo = true;
        if (#messageHasIntent("turn on")) set $currentAction = "turn on";
        if (#messageHasIntent("turn off")) set $currentAction = "turn off";
        if (#messageHasIntent("open")) set $currentAction = "open";
        if (#messageHasIntent("close")) set $currentAction = "close";
        return;
    }
}

digression yesOrNo
{
    conditions { on $yesNoEnabled; }
    do
    {
        if(#messageHasSentiment("positive"))
        {
            var result = external command( $currentTarget, $currentAction);
            #sayText(result.details);          
        }
        else if(#messageHasSentiment("negative"))
        {
            #say("asYouWish");        
        }
        else
        {
            set $yesNoEnabled = false;
            return;
        }

        set $newInfo = false;
        set $yesNoEnabled = false;
        return;
    }
}

preprocessor digression commandUpdater
{
    conditions
    {
        on #getIdleTime() - $lastIdleTime > 8000 tags: ontick;
    }
    do
    {
        var result = external checkCommandUpdate();
        if (result.success)
        {
            #sayText(result.details);
            set $currentTarget = result.target;
            set $currentAction = result.action;
            set $lastIdleTime = #getIdleTime();
            set $yesNoEnabled = true;
        }
        set $lastIdleTime = #getIdleTime();
        return;
    }
}

preprocessor digression forgetTarget
{
    conditions
    {
        on #getIdleTime() - $lastIdleTime > $forgetTime tags: ontick;
    }
    do
    {
        set $lastIdleTime = #getIdleTime();
        set $currentTarget = "";
        set $currentAction = "";
        set $yesNoEnabled = false;
        return;
    }
}

digression command
{
    conditions
    {
        on $newInfo;
    }
    do
    {
        set $newInfo = false;
        if ($currentAction == "")
        {
            #say("whatAction",
            {
                target: $currentTarget
            }
            );
            return;
        }
        if ($currentTarget == "")
        {
            #say("whatTarget",
            {
                action: $currentAction
            }
            );
            return;
        }
        var result = external command( $currentTarget, $currentAction);
        #sayText(result.details);
        set $lastIdleTime = #getIdleTime();

        return;
    }
}

start node root
{
    do
    {
        #connectSafe($phone);
        #waitForSpeech(1000);
        #say("intro");
        
        wait *;
    }
    transitions
    {
        bye: goto bye on #messageHasIntent("bye");
        closed: goto close on true tags: onclosed;
    }
}

node close
{
    do
    {
        exit;
    }
}

node bye
{
    do
    {
        #say("bye");
        #disconnect();
        exit;
    }
    transitions
    {
    }
}
