library

preprocessor digression reactive_listening
{
    conditions { on #random() < digression.reactive_listening.probability && #getCurrentTime() - #getLastVisitTime("reactive_listening") > digression.reactive_listening.lastReactionTime; }
    var probability = 0.1;
    var lastReactionTime = 0;
    do
    {
        set digression.reactive_listening.lastReactionTime = #getCurrentTime();
        //#say("mhm", repeatMode: "ignore");
        return;
    }
    transitions
    {
    }
}
