import { Client, Collection, Message } from 'discord.js';

class CommandHandler {
  private client: Client;
  private prefix: string;
  private commands: Collection<string, (message: Message, args: string[]) => void>;

  constructor(client: Client, prefix: string) {
    this.client = client;
    this.prefix = prefix;
    this.commands = new Collection();

    // Listen for messages
    this.client.on('messageCreate', message => this.handleMessage(message));
  }

  public registerCommand(name: string, execute: (message: Message, args: string[]) => void): void {
    if (typeof execute !== 'function') throw new Error('Execute must be a function');
    this.commands.set(name, execute);
  }

  private handleMessage(message: Message): void {
    if (!message.content.startsWith(this.prefix) || message.author.bot) return;

    const args = message.content.slice(this.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName || !this.commands.has(commandName)) return;

    try {
      const command = this.commands.get(commandName);
      if (command) command(message, args);
    } catch (error) {
      console.error(error);
      message.reply('There was an error trying to execute that command!');
    }
  }
}

export default CommandHandler;
