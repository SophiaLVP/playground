# Finance Feature
The world of San Andreas has a finance of its own. Players can carry cash, have bank accounts when
they're registered, and can waste their money in a variety of ways.

This feature implements regulation of that money.

## Regulating money on Las Venturas Playground
The [MoneyRegulator](money_regulator.js) is responsible for keeping track of the amount of cash a
player is carrying. The regulator is authoritative: the player's client can tell us that they have
ten times more money, but it wouldn't make a difference: an object aptly called the
[FinancialDispositionMonitor](financial_disposition_monitor.js) will put them back in line.

This immediately stops player's ability to money cheat: any discrepancies will simply be ignored. We
won't even bother informing administrators about it.

Small amounts of money exchanged in casinos, Pay 'n Spray shops and vehicle tuning shops will be
accounted for by the [FinancialDispositionMonitor](financial_disposition_monitor.js).

## Community contributions
Each experienced player on Las Venturas Playground is asked to make community contributions. This
actually is a form of tax, but let's be honest, it sounds nicer when it's for a good purpose.

This money is taken every minute from player's accounts when they have a certain amount of money
in their possession. The amount depends on whether they're registered, and whether they're a VIP
on Las Venturas Playground.

## Bank accounts
Each player on the server receives a bank account in which they can store money that should outlive
their current playing session. Use is straightforward, through the following commands:

  * `/balance` to display the bank account's balance.
  * `/bank [[amount] | all]` to deposit a certain amount of money.
  * `/withdraw [[amount] | all]` to withdraw a certain amount of money.

Bank accounts are currently limited to $5,354,228,880, but this may increase over time.
