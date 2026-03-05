#!/bin/bash
# A baj az hogy a ${`...`} benne magában TARTALMAZ `${...}` blokkokat. Ezért a belső backtickeket nem tudja jól kiszűrni a regex, mert van bent string interpoláció ami miatt a regex nem fogja a végét megtalálni.
# Cseréljük vissza az EREDETI (a submit előtti) állípotra az egész fájlt: `git checkout js/AdminPanel.js`
# És csak a "key" propot javítjuk meg, ami "key=${reg.id}" helyett `key="${reg.id}"` lett. Valamint visszavonjuk a key="${reg.id}" -> key=${reg.id} módosítást (mert htm requires explicit double quotes)
