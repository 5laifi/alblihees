import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vqtpcwzcqytvofrzsdhl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdHBjd3pjcXl0dm9mcnpzZGhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc0NTY1MiwiZXhwIjoyMDg3MzIxNjUyfQ.ZtkdWVyYeL_nz7YWQOPAv7GnhGUJeWWDWw4aNeLnEo0'
);

async function test() {
  const { data, error } = await supabase.from('media_items').select('*').limit(1);
  console.log('Test select:', data, error);
  if (data && data.length > 0) {
     const id = data[0].id;
     console.log('trying to delete id', id);
     const res = await supabase.from('media_items').delete().eq('id', id);
     console.log('Delete result:', res);
  }
}
test();
