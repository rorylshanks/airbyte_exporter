<a name="readme-top"></a>

<div align="center">
<h3 align="center">Airbyte Metrics Prometheus Exporter</h3>

  <p align="center">
    A Node.js application that authenticates to Airbyte using OAuth credentials and exposes connection/job metrics as Prometheus metrics.
    <br />
    <br />
    <a href="https://github.com/your-org/airbyte-metrics-exporter/issues">Report Bug</a>
    ·
    <a href="https://github.com/your-org/airbyte-metrics-exporter/issues">Request Feature</a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->
## About The Project

The Airbyte Metrics Prometheus Exporter is a Node.js application designed to authenticate to an Airbyte instance using client credentials, retrieve details about connections and their most recent job statuses, and expose these metrics to Prometheus. By integrating these metrics into your monitoring stack, you can gain deeper visibility into your data pipelines, track failed and successful jobs, and troubleshoot issues more efficiently.

Key benefits of this exporter include:

- **Centralized Monitoring**  
  Integrate Airbyte connection metrics into your existing Prometheus-based monitoring environment, giving you a single source of truth for your data pipeline status.

- **Real-time Status**  
  The exporter provides up-to-date information on the most recent job for each connection, ensuring timely alerting and fast response to failures.

- **Simplicity**  
  The exporter is straightforward to run and requires minimal setup, making it easy to add to your current infrastructure.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Running in Docker

A prebuilt Docker image is available at `rorylshanks/airbyte_exporter:latest`. To run the exporter using Docker:

```bash
docker run -d -p 3000:3000 \
  -e AIRBYTE_URL=http://your-airbyte-instance:8000 \
  -e CLIENT_ID=your_client_id \
  -e CLIENT_SECRET=your_client_secret \
  rorylshanks/airbyte_exporter:latest
```

This command pulls the image, sets the required environment variables, and starts the exporter on port 3000.

### Running Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/your-org/airbyte-metrics-exporter.git
   ```
   
2. Install dependencies:
   ```bash
   cd airbyte-metrics-exporter
   npm install
   ```

3. Start the application:
   ```bash
   AIRBYTE_URL=http://your-airbyte-instance:8000 \
   CLIENT_ID=your_client_id \
   CLIENT_SECRET=your_client_secret \
   npm start
   ```

### Accessing Metrics

Once the application is running (either locally or in Docker), you can access the Prometheus metrics at:

```
http://localhost:3000/metrics
```

Configure Prometheus to scrape this endpoint at regular intervals to gather metrics on Airbyte connections and their last job statuses.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONFIGURATION -->
## Configuration

The exporter is configured using environment variables:

- `AIRBYTE_URL`: The base URL for your Airbyte instance (e.g. `http://localhost:8000`).
- `CLIENT_ID`: Your Airbyte OAuth client ID.
- `CLIENT_SECRET`: Your Airbyte OAuth client secret.
- `PORT`: The port on which the exporter will run (default: `3000`).

Make sure your Airbyte instance and credentials allow access to the necessary API endpoints.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are welcome! If you have a suggestion or feature request, please fork the repository and open a pull request, or open an issue with the "enhancement" label.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
