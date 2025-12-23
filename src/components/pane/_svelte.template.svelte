<script>
  // Metadata for the pane
  export const paneMetadata = {
    title: 'Pane Title',
    description: 'Description of the pane.',
  };

  // Props type for the pane
  export let config;
  export let data;

  export const metadata = {
    title: 'Pane Title',
    description: 'Description of the pane.',
  };
</script>

<div>
  <!-- Pane content goes here -->
  <h1>{paneMetadata.title}</h1>
  <p>{paneMetadata.description}</p>
</div>
