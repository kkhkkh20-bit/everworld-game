# Siege and entry combat

Armies now march, besiege, breach, enter the settlement for six simulation days, resolve combat, and return. An undefended entrance also uses the entry phase. Population casualties, food loot and occupation use the existing simulation; individual rendered soldiers are representative formations, not independent tactical agents. Time skips can advance past the visible battle.

Closed gates and breached rubble, defenders, siege engines and entering faction-colored formations are drawn on the village map. Opening an active battlefield centers the gate, including on mobile. The war panel provides battlefield buttons.

Home commanders are selected from actual deployed residents using skill, stamina, dexterity, discipline and reasoning. Neighboring commanders are persistent named military records; neighboring civilian individuals remain aggregate simulations. Martial strength increases siege damage by up to 20%; combined martial and leadership bonuses increase army power by at most 35%. Numbers, health, training, terrain and supply still matter. Construction completion is suspended during siege/entry; missing armies return without fabricated combat.

Validation: siege-assault.cjs covers fortress level 3 breach, delayed conquest, mid-assault save/load, bounded commander advantage and a three-soldier failure despite maximum martial strength. terrain-war.cjs covers costs, return, occupation and autonomous conflict. terrain-war-ui.cjs checks mobile gate/inside screenshots, stage labels, battlefield buttons and browser errors. Five-year seeds 1840 and 7 produced 6 and 5 battles, 2 occupations each, 12 living towns each and no original-town starvation deaths.
