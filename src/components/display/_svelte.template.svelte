<script>
  // Metadata for the display
  export const displayMetadata = {
    title: 'Display Title',
    description: 'Description of the display.',
  };

  // Props type for the display
  export let config;
  export let data;
</script>

<div>
  <!-- Display content goes here -->
  <h1>{displayMetadata.title}</h1>
  <p>{displayMetadata.description}</p>
</div>
