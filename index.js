const { client } = require("./client.js")
const fs = require("fs")
const db = require("./db.js")
const utils = require("./utils.js")
const settings = require("./settings.js")
const { handleCommand_newClan } = require("./cmd_newClan.js")
const { handleCommand_viewClan } = require("./cmd_viewClan.js")
const { handleCommand_newMatch } = require("./cmd_newMatch.js")


client.on("message", async (msg) =>
{
	if (!msg.content.startsWith(settings.commandPrefix))
		return
	
	const commandMap =
	[
		["NewClan", handleCommand_newClan],
		["ViewClan", handleCommand_viewClan],
		["NewMatch", handleCommand_newMatch],
	]
	
	if (msg.content.toLowerCase().startsWith(settings.commandPrefix + "help"))
	{
		let helpStr = "\n:book: Available commands:\n```"
		
		for (let i = 0; i < commandMap.length; i++)
		{
			helpStr += settings.commandPrefix + commandMap[i][0].padEnd(15)
			if (i % 4 == 3)
				helpStr += "\n"
		}
		
		helpStr += "\n```"
		msg.reply(helpStr)
		return
	}
	
	for (const command of commandMap)
	{
		if (!msg.content.toLowerCase().startsWith(settings.commandPrefix + command[0].toLowerCase()))
			continue
		
		try { await command[1](msg) }
		catch (e)
		{
			if (e != null)
			{
				msg.reply("\n:warning: Internal server error!")
				console.log()
				console.log()
				console.error("Error!")
				console.log()
				console.error(e)
				console.log()
				console.log()
			}
		}
		
		return
	}
	
	msg.reply("\n:warning: Invalid command! Type `" + settings.commandPrefix + "help` for assistance!")
})


client.on("messageReactionAdd", (messageReaction, user) =>
{
	if (user.id == client.user.id)
		return
	
	for (let i = client.reactionHandlers.length - 1; i >= 0; i--)
	{
		const handler = client.reactionHandlers[i]
		
		if (handler.msgId != messageReaction.message.id)
			continue
		
		if (handler.emojiList.find(e => e == messageReaction._emoji.name) == null)
			continue
		
		if (!utils.checkMemberPermissionWith(messageReaction.message.channel.guild, user))
			continue
		
		client.reactionHandlers.splice(i, 1)
		
		handler.promiseResolve({ emoji: messageReaction._emoji.name, user, msgId: messageReaction.message.id })
	}
})


client.on("ready", async () =>
{
	console.log("Logged in as " + client.user.tag + "!")
	client.user.setActivity("type " + settings.commandPrefix + "help")
})


client.on("error", console.error)


client.login(fs.readFileSync("secretLoginToken.txt", "utf8"))