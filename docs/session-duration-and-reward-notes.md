## Settings page
For the settings page, we have decided that the user can freely write any amount of minutes as reward time.
But for the session duration minutes, we have decided to have set options for them to pick. The sessions can be 5, 10, 15, 20, 25 or 30 minutes each. They can't insert any number of choice, as it could cause some "awkward" scenarios. For example if the user chose 7 minute sessions and had a 30 minute daily goal, then they would have to actually do 5 more minutes of work than they wanted to. This avoids these edge cases by doing so.

## Reward 
When the user has finished a session, they will be prompted with a a button to claim their reward.
If they choose to do so, they will be instant redirected to their time wasting site. This just as before when Wassim had implemented the reward function.

### Reward Redirect
Once the user's reward time is over, they will get an redirect prompt where they are asked whether to stay here or to be redirected. In the previous iteration of reward time they would be instant redirected back to their learning site. This felt more like a pain point, as the user might be doing something where they would just need a minute to finish reading etc. With instant redirect, you might get cut off at an unsatisfying moment, which could lead to the user resenting the extension.

## Learning site edge cases
When the user is on reward time, they could potentially go back to their learning site whilst on reward time. So to handle this, the code regarding the learning site, has to check if the user is either in session mode or is in reward mode. Depending on these two, the injection overlay should reflect that. So if in session, then display how much time the user has left on the session and vice versa for the reward time.

But if the user happens to be on the learning site whilst on reward time, the code also has to take care of another edge case. Normally when the user is on the time wasting site and their reward time ends, they will be prompted whether to redirect or not. But if the user is on the learning site when that happens, then being prompted would again be a pain point. Because if you are on the learning site, most likely you are just interested in getting a new session started. So to handle this, the code checks when you are on a learning site if the reward time has ended. If you are, a new session will just begin and the injection overlay will reflect those changes.

## Daily Goal
When implementing sessions, we had to change away such that the injection overlay looks at how much time of the session is left and not of the daily goal. 

Furthermore, the code has to keep track of how much time has been added to the overall daily goal for each session. So the time for each session has to persist, such that the user reaches the daily goal, when enough time has acculumated. 

Of course the code also has to check if the daily goal has been reached, and if that is the case no more sessions should begin. 