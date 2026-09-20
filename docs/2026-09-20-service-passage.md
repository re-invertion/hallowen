# Strefa techniczna za pierwszym korytarzem

## Cel

Pierwsze drzwi nie kończą już próby. Po zdobyciu klucza otwierają przejście do dodatkowego, około dziesięciometrowego odcinka technicznego. Lekarz pozostaje aktywny i może ścigać gracza również po przekroczeniu drzwi.

## Zmiany

- granica ruchu po otwarciu drzwi została przesunięta z końca pierwszego korytarza do końca strefy technicznej;
- warunek wygranej jest teraz za `z = 29.5`, a nie bezpośrednio za drzwiami przy `z = 19`;
- scena została wydłużona i otrzymała stalowe łuki, przewody, skrzynki instalacyjne, dodatkowe oświetlenie oraz oznaczenia strefy;
- cel w HUD po otwarciu drzwi informuje o konieczności przejścia dalszej części trasy;
- test logiki potwierdza, że przekroczenie pierwszych drzwi nie daje wygranej;
- test lokomocji obejmuje nową granicę ruchu;
- browser-check robi dodatkowy zrzut strefy technicznej i sprawdza zakończenie dopiero na jej końcu.

## Odbiór

Zmiana wymaga ponownego sprawdzenia na Meta Quest 2: czytelności oznaczeń, płynności na wydłużonej scenie oraz zachowania lekarza po przejściu przez pierwsze drzwi. Nie deklarujemy wyniku sprzętowego bez testu w goglach.
