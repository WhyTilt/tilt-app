// Mock Docker integration tests
const Docker = require('node-docker-api').Docker;

// Mock Docker API
jest.mock('node-docker-api', () => ({
  Docker: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    container: {
      list: jest.fn(),
      get: jest.fn()
    }
  }))
}));

describe('Docker Integration', () => {
  let docker;

  beforeEach(() => {
    docker = new Docker();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should detect Docker availability', async () => {
    // Mock successful Docker connection
    docker.info.mockResolvedValue({
      ServerVersion: '24.0.0',
      Architecture: 'x86_64'
    });

    const info = await docker.info();
    expect(info).toHaveProperty('ServerVersion');
    expect(docker.info).toHaveBeenCalledTimes(1);
  });

  test('should handle Docker unavailable', async () => {
    // Mock Docker connection failure
    docker.info.mockRejectedValue(new Error('Docker not running'));

    await expect(docker.info()).rejects.toThrow('Docker not running');
  });

  test('should list containers', async () => {
    // Mock container list
    const mockContainers = [
      {
        id: 'container1',
        data: {
          Image: 'tilt:latest',
          State: 'running',
          Names: ['/tilt-container']
        }
      }
    ];

    docker.container.list.mockResolvedValue(mockContainers);

    const containers = await docker.container.list({ all: true });
    expect(containers).toHaveLength(1);
    expect(containers[0].data.Image).toBe('tilt:latest');
  });

  test('should find Tilt container', async () => {
    const mockContainers = [
      {
        id: 'other-container',
        data: {
          Image: 'nginx:latest',
          State: 'running',
          Names: ['/nginx']
        }
      },
      {
        id: 'tilt-container',
        data: {
          Image: 'tilt:latest',
          State: 'running',
          Names: ['/tilt-app']
        }
      }
    ];

    docker.container.list.mockResolvedValue(mockContainers);

    const containers = await docker.container.list({ all: true });
    const tiltContainer = containers.find(container => 
      container.data.Image.includes('tilt') || 
      container.data.Names.some(name => name.includes('tilt'))
    );

    expect(tiltContainer).toBeTruthy();
    expect(tiltContainer.data.Image).toBe('tilt:latest');
  });
});