<div align="center">
<h1 style=color:blue>Pokémon ✨ Shiny Hunting Database</h1>
<img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXgwYnpmMGJsenN5aWFyZGU1Zzc3eW8xb2JvbzZic2F4cnRtNHVzNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/AFpghpBCYEAwM/giphy.gif" Pikachu Walking with Ketchup/>
</div>

<div align="center">
<h2>Keep track of your Generation 2-5 ✨ shiny hunts and share your progress with other community members.</h2>
</div>
<br>

## Inspiration
I grew up playing Pokémon Red and Silver on my original Gameboy, relying on the snap-on [Gameboy light and magnifying glass](https://www.thevintagegamers.com/2013/11/game-boy-screen-magnifiers/) when playing at night and light from my bedroom window in the early mornings. Shoutout to the family in our neighborhood who let me purchase two original Gameboys, two copies of Red, Silver, and a host of other games for a few crumpled up bucks back in the day.

A few birthdays later I received a Gameboy Advance SP from my parents and vividly remember picking up Pokémon Emerald from Target for ~$34 when it came out. I've played games from every generation through generation 8, but nothing comes close to the magic of generations 1-5.

I find shiny hunting to be a fun background activity, one that involves strategy, math, and perseverance. Recently I have returned to Emerald and FireRed as a nostalgic trip, searching for my favorite shinies as a side hobby. In my opinion keeping track of encounter numbers within a little .txt file or note on my phone is an injustice, so I created this interface to give the hunts life. Now they can be viewed by others and updated from any device. It even calculates the probability of finding the shiny so far depending on how many encounters you've seen. Interestingly enough, for full-odds hunts (1/8192 odds), the probability of finding a shiny in the first 8192 encounters is just over 63%, so we can expect ~37% of hunts to go over odds.

## Project Specs
This application leverages Supabase for backend purposes and user authentication. Once an account has been created, users can create new shiny hunts by specifying the Pokémon name, game, and hunting method they're using. PokéAPI is utilized for shiny sprites. As hunts progress, users can increment the number of encounters directly on the web application and toggle the target as "found" once the shiny is found.

In addition to creating hunts, users can delete their hunts, view other users' hunts, and of course update the number of encounters and shiny discovery status, allowing database CRUD operations to be performed all from the interface itself.

## Get Started
Simply sign up using your email, set a password for your account, and start some shiny hunting!