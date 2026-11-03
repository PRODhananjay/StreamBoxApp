// Sample data for demo mode ("Try demo"). Same open-licence Blender films as supabase.sql.
const BASE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';

export const DEMO_USER = { id: 'demo', email: 'Demo mode (not signed in)' };

export const DEMO_MOVIES = [
  { id: 'demo-1', title: 'Big Buck Bunny', year: 2008, genre: 'Comedy', mins: 10, hue: 130,
    about: 'A gentle giant rabbit wakes up to a sunny meadow, until three mischievous rodents decide to ruin his day. He plans a very creative payback.',
    video_url: BASE + 'BigBuckBunny.mp4',
    poster_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Big_buck_bunny_poster_big.jpg?width=600' },
  { id: 'demo-2', title: 'Sintel', year: 2010, genre: 'Fantasy', mins: 15, hue: 20,
    about: 'A lone young woman searches distant mountains and harsh lands for the small dragon she once befriended, and finds more than she bargained for.',
    video_url: BASE + 'Sintel.mp4',
    poster_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sintel_poster.jpg?width=600' },
  { id: 'demo-3', title: 'Tears of Steel', year: 2012, genre: 'Sci-Fi', mins: 12, hue: 210,
    about: 'In a future Amsterdam, a group of warriors and scientists try to save the world by repairing a mistake from the past with robots and a risky experiment.',
    video_url: BASE + 'TearsOfSteel.mp4',
    poster_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tos-poster.png?width=600' },
  { id: 'demo-4', title: 'Elephants Dream', year: 2006, genre: 'Sci-Fi', mins: 11, hue: 280,
    about: 'Two strange men wander through a vast mechanical world where one trusts what he sees and the other knows better. A surreal journey about perception.',
    video_url: BASE + 'ElephantsDream.mp4',
    poster_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Elephants_Dream_s5_both.jpg?width=600' },
];
