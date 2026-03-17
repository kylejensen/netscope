import { Event } from '../types';

const MEETUP_OAUTH_TOKEN = process.env.MEETUP_OAUTH_TOKEN || '';
const MEETUP_GRAPHQL_URL = 'https://api.meetup.com/gql';

// Chicago coordinates
const CHICAGO_LAT = 41.8781;
const CHICAGO_LON = -87.6298;
const SEARCH_RADIUS_MILES = 25;

export async function scrapeMeetup(): Promise<Event[]> {
  if (!MEETUP_OAUTH_TOKEN) {
    console.warn('⚠️  Meetup OAuth token not configured');
    return [];
  }

  const events: Event[] = [];

  try {
    const query = `
      query ($filter: KeywordSearchFilterInput!) {
        keywordSearch(filter: $filter) {
          count
          edges {
            node {
              result {
                ... on Event {
                  id
                  title
                  description
                  eventUrl
                  dateTime
                  endTime
                  timezone
                  going
                  venue {
                    name
                    address
                    city
                    state
                  }
                  group {
                    name
                  }
                  featuredPhoto {
                    baseUrl
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      filter: {
        query: 'tech business startup networking',
        lat: CHICAGO_LAT,
        lon: CHICAGO_LON,
        radius: SEARCH_RADIUS_MILES,
        source: 'EVENTS',
      },
    };

    const response = await fetch(MEETUP_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MEETUP_OAUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8000), // 8s timeout guard
    });

    if (!response.ok) {
      console.error(`Meetup API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const edges = data?.data?.keywordSearch?.edges || [];

    for (const edge of edges) {
      const evt = edge.node?.result;
      if (!evt || !evt.title) continue;

      events.push({
        id: `meetup-${evt.id}`,
        title: evt.title,
        description: evt.description?.substring(0, 500) || '',
        start_date: evt.dateTime,
        end_date: evt.endTime || '',
        location: evt.venue?.name || `${evt.venue?.city}, ${evt.venue?.state}` || 'Chicago, IL',
        format: evt.venue ? 'in-person' : 'virtual',
        type: 'meetup',
        topics: inferTopics(evt.title, evt.description || ''),
        cost: 'free', // Most Meetups are free
        url: evt.eventUrl,
        source: 'meetup',
        image_url: evt.featuredPhoto?.baseUrl,
        status: 'active',
      });
    }

    console.log(`✅ Scraped ${events.length} events from Meetup`);
  } catch (error) {
    console.error('Error scraping Meetup:', error);
  }

  return events;
}

function inferTopics(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const topics: string[] = [];
  
  if (text.includes('tech') || text.includes('software') || text.includes('developer')) topics.push('tech');
  if (text.includes('business') || text.includes('entrepreneur') || text.includes('startup')) topics.push('business');
  if (text.includes('network')) topics.push('networking');
  if (text.includes('ai') || text.includes('machine learning')) topics.push('tech');
  
  return topics.length > 0 ? topics : ['networking'];
}
