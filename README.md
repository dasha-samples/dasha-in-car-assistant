#Build a talking car app with Dasha AI

To launch the app: 

1. Get your Dasha API key. You'll need to pop into the [Dasha Developer Community](https://community.dasha.ai). 
2. Make sure you have latest Node.js, NPM and VS Code installed. In VS Code extension marketplace install Dasha Studio extension. 
3. Clone the repo and open the project in Visual Studio Code. 
4. In the terminal `dasha account login` to register your API key. `npm i` then `npm start chat` for text chat or `npm start 12223334455` where 12223334455 is your phone number in the international format. You will get a call on your phone.

You can follow the tutorial below to recreate this application. 

Open the repo in VS Code. 

Go to __main.dsl__.

In the first few lines, the context variables and types are declared.

```dsl
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
```

Now that we’ve got that part out of the way, we can move on to lines 29-48.

```dsl
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
```

In the __`preprocessor digression targetFiller`__ we program a conversational AI app to understand what car part the driver chooses. A __digression__ is a node which can be called up from any point in the conversation. This is how the AI responds to inevitable tangents that humans bring up in conversation. You can also use digressions to specify numerous responses to a phrase such as "how can I help you today?" A __preprocessor__ is a digression which doesn't consume a message, it performs some function but goes unseen by the end user. You can read more about digressions in this [post](https://dasha.ai/en-us/blog/using-digressions).  You can read more about Dasha preprocessor digressions in our [documentation](https://docs.dasha.ai/en-us/default/dasha-script-language/program-structure?searchResult=p73-highlight-0#digression). 

At this point the driver can specify either the wanted car part or what they want to be done with that part, which is shown in line 33:

```dsl
        on #messageHasData("car_function") or #messageHasData("car_part") priority 2000;
```

Now that the AI got one piece of information we need to teach it to get the rest of it. If it classifies the received info as a target (car part), it remembers it and asks about what the driver would like to be done with that car part. For example, a driver says “the window”, AI would ask “What should I do with the window?”, and once it receives an “open” or “close” command, it will proceed accordingly. 

Note that it’s not necessary for the driver to specify the action and the car part separately, they can say “open the window” and, since both fillers are known, the AI will immediately open the window. 

Speaking of actions and car parts, you can check them out under intents and entities in the tab section under “data.json”. We’ll take a look at the actions below but for now, let’s focus on the car parts. 

```json
  "entities": {
    "car_part": {
      "open_set": false,
      "values": [
        { "value": "trunk", "synonyms": ["boot", "luggage", "luggage boot"] },
        { "value": "window", "synonyms": ["windows"]}
      ]
    },
```

In the context of Dasha, an entity is a word or a phrase the value of which is extracted and categorized from the user's words. Here we have __`“trunk”`__ and __`“window”`__, which are parts of the car. In order to make your in car voice assistant understand that the driver wants to open the trunk when receiving the __`“open boot”`__ command, it’s necessary to add synonyms when writing down the entities. You can learn more about named entities [here](https://dasha.ai/en-us/blog/named-entity-recognition).

Move to lines 50-68 in __main.dsl__.

```dsl
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
```

In the __`preprocessor digression actionFiller`__ part we program what action we want to be performed once the command __`on #messageHasAnyIntent(digression.actionFiller.commands) priority 2000;`__ was triggered

In this particular instance, we see that the commands are written out in line 56: __`"turn on"`__, __`"turn off"`__, __`"open"`__, and __`"close"`__. #messageHasAnyIntent is what triggers the command. 

Look at __data.json__ This is where you list your training data to be used to train the neural networks powering intent classification of the conversational app. You can read more about it [here](https://dasha.ai/en-us/blog/intent-classification).  It includes the commands we specified earlier which are followed by “includes”, which means that the phrases listed below are the triggers of that specific command. Notice that, for example, in the “turn off” part we have the word **light** in parentheses and **car function** in brackets. It doesn’t mean that the __`“turn off”`__ command will only be triggered once the driver wants the lights turned off; it includes all the car functions that you program the app to know. 

```json
{
  "version": "v2",
  "intents": {
    "open": {
      "includes": [
        "open",
        "open the (trunk)[car_part]",
        "open (trunk)[car_part]",
        "(trunk)[car_part] open"
      ]
    },
    "close": {
      "includes": [
        "close",
        "close the (trunk)[car_part]",
        "close (trunk)[car_part]",
        "(trunk)[car_part] close"
      ]
    },
    "turn on": {
      "includes": [
        "turn on",
        "enable",
        "turn on the (headlights)[car_function]",
        "turn on (light)[car_function]",
        "turn (light)[car_function] on",
        "turn the (light)[car_function] on",
        "enable the (light)[car_function]",
        "enable (light)[car_function]",
        "(light)[car_function] on"
      ]
    },
    "turn off": {
      "includes": [
        "turn off",
        "disable",
        "disable the (light)[car_function]",
        "disable (light)[car_function]",
        "turn off the (light)[car_function]",
        "turn off (light)[car_function]",
        "turn (light)[car_function] off"
      ]
    }
```

For the purposes of this demo, we’ve listed four car functions that are listed in the “index.js” file. 

The default car settings, in this case, are that the light (and the AC) are turned off. The “true” part indicates a command can be performed and the “false” part shows the contrary, hence __`light: { “turn on”: true, “turn off”: false }`__. The same logic applies to the trunk and the windows, which are close by default. 

Now that the conversational AI app has received a command, it remembers it and sets the current action to that command (__`set $currentAction = command;`__).

Lines 70-119 describe that our in-car voice assistant will check for specific conditions and ask the driver if they want an action to be performed based on that condition. Let’s consider an example when it’s winter and it’s snowing outside. The car has a snow mode and is equipped with an anti-lock braking system and traction control. When the car voice assistant gets a signal that the car owner is driving in a snowy environment, it will say the following: “It's snowing outside. Would you like to turn the snow mode on?". Here the target is "snow mode" and the action is “turn on”. We’ve programmed the voice AI assistant to check for such conditions every 8000ms (8 seconds; note that the timing can be changed). 

Now it’s up to the driver whether to let the in-car voice assistant turn on the snow mode. Should the driver say “yes”, the assistant recognizes it as a positive sentiment ("snow mode") and follows the command. It’s important not to forget that the driver might repeat after the voice assistant and say something like “turn the snow mode on” (__`#messageHasIntent($currentAction??"")`__) and have AI recognize the command. After turning the snow mode on, the driver will be alerted of the result (__`#sayText(result.details);`__). If the driver decides to have snow mode on, the assistant will note the sentiment was negative and say “as you wish” (__`#say("asYouWish");`__).

```dsl
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
```

After the snow mode was turned on, the assistant sets target and action back to default and goes on to check for new commands every 8 seconds.

```dsl
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
```

Another possible command that is useful in wintertime is for the assistant to check for the temperature inside the car and offer to turn the heat mode if the temperature drops to a certain degree.

Let’s consider a situation when the assistant offers to turn the heat on but the driver urgently needs to open the window. In this case, it’s critical for the conversational AI to recognize that the new command is the priority and opens the window (more on digressions [here](https://dasha.ai/en-us/blog/using-digressions):

```dsl
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
```

Make whatever changes you see fit and test along the way. 

Don't forget to [let us know](https://community.dasha.ai) if you've got any feedback. 
