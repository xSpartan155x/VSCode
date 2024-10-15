try:
    reaction, user = await bot.wait_for('', check=lambda r, u: u==ctx.author and r.message.channel.id == ctx.channel.id, timeout=|15,30,45,60,120,300,900|)
except asyncio.TimeoutError:
    return await ctx.send("You didn't respond")
else:
