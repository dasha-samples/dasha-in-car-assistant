import "./commonDialogue.dsl";

context
{
    input phone: string,
    currentTarget: string? = null,
    currentAction: string? = null,
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
external function command(target: string?, action: string?): CallResult;
external function checkCommandUpdate(): CallResultExtended;

preprocessor digression targetFiller
{
    conditions
    {
        on #messageHasData("car_function") or #messageHasData("car_part") priority 2000;
    }
    do
    {
        set $newInfo = true;
        if (#messageHasData("car_function")){
            set $currentTarget = #messageGetData("car_function")[0]?.value;
            return;  
        }
        if (#messageHasData("car_part")){
            set $currentTarget = #messageGetData("car_part")[0]?.value;
            return;  
        }
        return;
    }
}

preprocessor digression actionFiller
{   
    conditions
    {
        on #messageHasAnyIntent(digression.actionFiller.commands) priority 2000;
    }
    var commands: string[] = ["turn on", "turn off", "open", "close"];
    do
    {
        set $newInfo = true;
        for (var command in digression.actionFiller.commands){
            if (#messageHasIntent(command)) {
                set $currentAction = command;
                return;
            }
        }
        return;
    }
}

digression yesOrNo
{
    conditions { on $yesNoEnabled; }
    do
    {
        if(#messageHasSentiment("positive") or #messageHasIntent($currentAction??""))
        {   
            if ($currentTarget is null or $currentTarget is null) {return; }
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
        set $lastIdleTime = #getIdleTime();
        set $currentTarget = null;
        set $currentAction = null;
        set $yesNoEnabled = false;
        set $newInfo = false;
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
        set $currentTarget = null;
        set $currentAction = null;
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
        if ($currentAction is null)
        {
            #say("whatAction", { target: $currentTarget });
            return;
        }
        if ($currentTarget is null)
        {
            #say("whatTarget", { action: $currentAction });
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
