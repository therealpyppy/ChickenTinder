const locationInput = document.getElementById('location');
const radiusInput = document.getElementById('radius');
const radiusValue = document.getElementById('radius-value');
const pickBtn = document.getElementById('pick-btn');
const resultDetails = document.querySelector('.result-details');
const resultHeader = document.querySelector('.result-header');
const restaurantName = document.getElementById('restaurant-name');
const restaurantAddress = document.getElementById('restaurant-address');
const restaurantCuisine = document.getElementById('restaurant-cuisine');
const restaurantAdditional = document.getElementById('restaurant-additional');
const restaurantImage = document.getElementById('restaurant-image');

const MAPBOX_CID = 'YOUR_MAPBOX_API_KEY';
const MAPBOX_API_KEY = 'YOUR_MAPBOX_API_KEY';

function init() {
	radiusInput.addEventListener('input', (e) => {
		radiusValue.textContent = `${e.target.value}m`;
	});
	
	pickBtn.addEventListener('click', handlePickClick);
}

async function handlePickClick() {
	const location = locationInput.value.trim();
	if (!location) {
		alert('Please enter a location');
		return;
	}
	
	try {
		pickBtn.disabled = true;
		pickBtn.innerHTML = '<span class="loading"></span> Finding a restaurant...';
		resultHeader.innerHTML = '<h2>Finding a random restaurant...</h2>';
		resultDetails.style.display = 'none';
		
		const coords = await getCoordinates(location);
		if (!coords) {
			throw new Error('Location not found');
		}
		
		const restaurant = await getRestaurantWithFallback(coords);
		if (!restaurant) {
			throw new Error('No restaurants found in this area');
		}
		
		displayRestaurant(restaurant);
		
	} catch (error) {
		console.error('Error:', error);
		resultHeader.innerHTML = `<h2>Error: ${error.message}</h2>`;
		resultDetails.style.display = 'none';
	} finally {
		pickBtn.disabled = false;
		pickBtn.innerHTML = '<i class="fas fa-random"></i> Pick a Random Restaurant';
	}
}

async function getCoordinates(location) {
	try {
		const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
			headers: {
				'User-Agent': 'RandomRestaurantPicker/1.0',
				'Accept': 'application/json'
			}
		});
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		if (data && data.length > 0) {
			return {
				lat: parseFloat(data[0].lat),
				lon: parseFloat(data[0].lon),
				displayName: data[0].display_name
			};
		}
		return null;
	} catch (error) {
		console.error('Error in getCoordinates:', error);
		throw error;
	}
}

async function getRestaurantWithFallback(coords) {
	try {
		const mapboxRestaurant = await getMapboxRestaurant(coords);
		if (mapboxRestaurant && hasSufficientData(mapboxRestaurant)) {
			console.log('Using Mapbox data');
			return mapboxRestaurant;
		}
		
		console.log('Using OpenStreetMap data');
		return await getOSMRestaurant(coords);
	} catch (error) {
		console.error('Error in getRestaurantWithFallback:', error);
		return await getOSMRestaurant(coords);
	}
}

function hasSufficientData(restaurant) {
	const requiredFields = ['name', 'address'];
	const importantFields = ['phone', 'website', 'openingHours', 'cuisine'];
	
	const hasRequired = requiredFields.every(field => restaurant[field]);
	const hasImportant = importantFields.filter(field => restaurant[field]).length >= 2;
	
	return hasRequired && hasImportant;
}

async function getMapboxRestaurant(coords) {
	try {
		const radius = radiusInput.value;
		const response = await fetch(
			`https://api.mapbox.com/geocoding/v5/mapbox.places/restaurant.json?proximity=${coords.lon},${coords.lat}&radius=${radius}&types=poi&access_token=${MAPBOX_API_KEY}`
		);
		
		if (!response.ok) {
			throw new Error(`Mapbox API error: ${response.status}`);
		}
		
		const data = await response.json();
		if (!data.features || data.features.length === 0) {
			return null;
		}
		
		const randomPlace = data.features[Math.floor(Math.random() * data.features.length)];
		
		return {
			source: 'mapbox',
			name: randomPlace.text,
			address: randomPlace.place_name,
			coordinates: {
				lat: randomPlace.center[1],
				lon: randomPlace.center[0]
			},
			phone: randomPlace.context?.find(c => c.id.startsWith('phone'))?.text,
			website: randomPlace.properties?.website,
			categories: randomPlace.properties?.category?.split(','),
			cuisine: randomPlace.properties?.category
		};
	} catch (error) {
		console.error('Error in getMapboxRestaurant:', error);
		return null;
	}
}

async function getOSMRestaurant(coords) {
	try {
		const radius = radiusInput.value;
		
		const query = `
			[out:json][timeout:25];
			(
				node["amenity"="restaurant"](around:${radius},${coords.lat},${coords.lon});
				node["amenity"="fast_food"](around:${radius},${coords.lat},${coords.lon});
				node["amenity"="cafe"](around:${radius},${coords.lat},${coords.lon});
			);
			out body;
			>;
			out skel qt;
		`;
		
		const response = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			body: `data=${encodeURIComponent(query)}`,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});
		
		if (!response.ok) {
			throw new Error(`OSM API error: ${response.status}`);
		}
		
		const data = await response.json();
		if (!data.elements || data.elements.length === 0) {
			return null;
		}
		
		const randomRestaurant = data.elements[Math.floor(Math.random() * data.elements.length)];
		
		const details = await getRestaurantDetails(randomRestaurant);
		
		return {
			source: 'osm',
			name: details.tags.name || 'Unnamed Restaurant',
			address: details.address,
			coordinates: {
				lat: details.lat,
				lon: details.lon
			},
			phone: details.phone,
			website: details.website,
			openingHours: details.openingHours,
			cuisine: details.cuisine,
			takeaway: details.takeaway === 'yes',
			delivery: details.delivery === 'yes',
			wheelchair: details.wheelchair === 'yes',
			outdoorSeating: details.outdoorSeating === 'yes',
			smoking: details.smoking,
			paymentMethods: details.paymentMethods
		};
	} catch (error) {
		console.error('Error in getOSMRestaurant:', error);
		return null;
	}
}

async function getRestaurantDetails(restaurant) {
	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${restaurant.lat}&lon=${restaurant.lon}&zoom=18&addressdetails=1`,
			{
				headers: {
					'User-Agent': 'RandomRestaurantPicker/1.0',
					'Accept': 'application/json'
				}
			}
		);
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		
		return {
			...restaurant,
			address: data.display_name,
			details: data.address,
			phone: restaurant.tags.phone || restaurant.tags['contact:phone'],
			website: restaurant.tags.website || restaurant.tags.url,
			openingHours: restaurant.tags['opening_hours'],
			cuisine: restaurant.tags.cuisine,
			takeaway: restaurant.tags.takeaway,
			delivery: restaurant.tags.delivery,
			wheelchair: restaurant.tags.wheelchair,
			outdoorSeating: restaurant.tags['outdoor_seating'],
			smoking: restaurant.tags.smoking,
			paymentMethods: restaurant.tags.payment_methods
		};
	} catch (error) {
		console.error('Error in getRestaurantDetails:', error);
		throw error;
	}
}

function displayRestaurant(restaurant) {
	restaurantName.textContent = restaurant.name;
	restaurantAddress.textContent = restaurant.address;
	
	if (restaurant.cuisine) {
		restaurantCuisine.textContent = `Cuisine: ${restaurant.cuisine}`;
	} else {
		restaurantCuisine.textContent = 'Cuisine type not specified';
	}
	
	let additionalInfo = '<div class="info-section">';
	
	additionalInfo += '<h4>Basic Information</h4>';
	if (restaurant.phone) {
		additionalInfo += `<p><strong>Phone:</strong> ${restaurant.phone}</p>`;
	}
	if (restaurant.website) {
		additionalInfo += `<p><strong>Website:</strong> <a href="${restaurant.website}" target="_blank">${restaurant.website}</a></p>`;
	}
	if (restaurant.openingHours) {
		additionalInfo += `<p><strong>Opening Hours:</strong> ${restaurant.openingHours}</p>`;
	}
	
	additionalInfo += '<h4>Services & Amenities</h4>';
	if (restaurant.takeaway) {
		additionalInfo += '<p>✓ Takeaway available</p>';
	}
	if (restaurant.delivery) {
		additionalInfo += '<p>✓ Delivery available</p>';
	}
	if (restaurant.outdoorSeating) {
		additionalInfo += '<p>✓ Outdoor seating available</p>';
	}
	if (restaurant.wheelchair) {
		additionalInfo += '<p>✓ Wheelchair accessible</p>';
	}
	if (restaurant.smoking) {
		additionalInfo += `<p><strong>Smoking:</strong> ${restaurant.smoking}</p>`;
	}
	if (restaurant.paymentMethods) {
		additionalInfo += `<p><strong>Payment Methods:</strong> ${restaurant.paymentMethods}</p>`;
	}
	
	additionalInfo += `
		<div class="data-source">
			<p><em>Data provided by ${restaurant.source.toUpperCase()}</em></p>
		</div>
	`;
	
	additionalInfo += '</div>';
	restaurantAdditional.innerHTML = additionalInfo;
	
	resultHeader.innerHTML = '<h2>Here\'s your random restaurant!</h2>';
	resultDetails.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', init);
