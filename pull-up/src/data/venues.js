// Venue names are invented; streets and neighbourhoods are real.
// Beaches and parks are real public places.

export const TYPES = {
  bar: { label: 'Bar', plural: 'Bars' },
  restaurant: { label: 'Restaurant', plural: 'Restaurants' },
  boardgames: { label: 'Board games', plural: 'Board games' },
  sports: { label: 'Sports', plural: 'Sports' },
}

export const CITIES = ['Haifa', 'Tel Aviv']

export const venues = [
  // Haifa
  { id: 'lantern', name: 'The Lantern Bar', type: 'bar', city: 'Haifa', neighborhood: 'Hadar', address: 'Masada St 18', distanceKm: 0.8 },
  { id: 'wadi', name: 'Wadi Taproom', type: 'bar', city: 'Haifa', neighborhood: 'Downtown', address: 'HaNamal St 31', distanceKm: 2.6 },
  { id: 'fennel', name: 'Fennel & Fig', type: 'restaurant', city: 'Haifa', neighborhood: 'German Colony', address: 'Ben Gurion Blvd 24', distanceKm: 1.9 },
  { id: 'stella', name: 'Stella Carmel Kitchen', type: 'restaurant', city: 'Haifa', neighborhood: 'Carmel Center', address: 'HaNassi Blvd 121', distanceKm: 3.4 },
  { id: 'meeple', name: 'Meeple House', type: 'boardgames', city: 'Haifa', neighborhood: 'Hadar', address: 'Herzl St 44', distanceKm: 1.1 },
  { id: 'dado', name: 'Dado Beach courts', type: 'sports', city: 'Haifa', neighborhood: 'Dado Beach', address: 'Promenade, south courts', distanceKm: 5.8 },

  // Tel Aviv
  { id: 'levinsky', name: 'Levinsky Wine Room', type: 'bar', city: 'Tel Aviv', neighborhood: 'Florentin', address: 'Levinsky St 52', distanceKm: 1.4 },
  { id: 'heron', name: 'Night Heron', type: 'bar', city: 'Tel Aviv', neighborhood: 'Florentin', address: 'Florentin St 9', distanceKm: 1.7 },
  { id: 'kerem', name: 'Kerem Table', type: 'restaurant', city: 'Tel Aviv', neighborhood: 'Kerem HaTeimanim', address: 'Nahliel St 6', distanceKm: 0.7 },
  { id: 'saffron', name: 'Saffron Alley', type: 'restaurant', city: 'Tel Aviv', neighborhood: 'City Center', address: 'Dizengoff St 141', distanceKm: 2.2 },
  { id: 'dice', name: 'Dice & Slice', type: 'boardgames', city: 'Tel Aviv', neighborhood: 'City Center', address: 'King George St 30', distanceKm: 0.9 },
  { id: 'yarkon', name: 'Park HaYarkon', type: 'sports', city: 'Tel Aviv', neighborhood: 'North Tel Aviv', address: 'Rowing centre entrance', distanceKm: 4.6 },
]

export const venuesById = Object.fromEntries(venues.map((v) => [v.id, v]))
